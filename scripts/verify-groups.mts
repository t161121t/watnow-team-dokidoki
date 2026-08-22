/**
 * prisma/sql/groups/*.sql のうち、scripts/verify-rls.mts でカバーしていない
 * create_group_invite_link/revoke_group_invite_link/join_group_via_invite_link
 * （issue #71、旧search_users/invite_member/accept_invite/decline_inviteの後継）、
 * leave_group/update_group_member_role/kick_group_member、および「最後のadminは
 * 操作できない」系のガードを実DBに対して検証する。Vitest等の自動テストは未導入
 * （技術選定.md参照）のため、暫定的にここに置く。
 *
 * 他のverifyスクリプトと同様、RPCは`withRlsContext`経由の生SQLで直接叩く
 * （`features/groups/server/*`は`server-only`が付いておりNext.jsのバンドラー
 * 外＝このスクリプトの実行環境からはimportできないため。呼び出しているSQL文
 * 自体は features/groups/server/* の各ファイルと同一）。
 *
 * 実行: npm run verify:groups
 */
import "dotenv/config";
import { Client } from "pg";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupInviteLinkRow, GroupMemberRow } from "@/features/groups/types";

/**
 * groups行への`FOR UPDATE`ロック（prisma/sql/groups/006_membership_lifecycle.sql）が
 * 実際に他のトランザクションをブロックするかを決定的に検証する。
 *
 * 下の「leave_groupの同時実行」テストはRPC本体を2並行で呼ぶ形だが、実際に
 * レースウィンドウを踏むかはタイミング依存で、ロックを外しても毎回失敗する
 * わけではない（ローカルの高速なDB往復では大抵どちらかが先にcommitしてしまう
 * ため）。そのため、ロック機構そのものの効果はここで別途、生の2コネクションで
 * `SELECT ... FOR UPDATE`が本当にブロックするかを`statement_timeout`を使って
 * 確認する（withRlsContext/Prismaの$transactionは単一コネクションを使い回す
 * ため、この検証には生の`pg.Client`を2本使う）。
 */
async function verifyForUpdateBlocks(groupId: string): Promise<boolean> {
  const c1 = new Client({ connectionString: process.env.DATABASE_URL });
  const c2 = new Client({ connectionString: process.env.DATABASE_URL });
  await c1.connect();
  await c2.connect();
  try {
    await c1.query("BEGIN");
    await c1.query("SELECT 1 FROM groups WHERE id = $1 FOR UPDATE", [groupId]);

    await c2.query("BEGIN");
    await c2.query("SET LOCAL statement_timeout = '500ms'");
    let blocked = false;
    try {
      await c2.query("SELECT 1 FROM groups WHERE id = $1 FOR UPDATE", [groupId]);
    } catch {
      blocked = true; // statement_timeoutで落ちた = ロック待ちでブロックされていた
    }
    await c2.query("ROLLBACK");
    await c1.query("COMMIT");
    return blocked;
  } finally {
    await c1.end();
    await c2.end();
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

async function assertRejects(fn: () => Promise<unknown>, msg: string) {
  try {
    await fn();
  } catch {
    console.log(`OK: ${msg}`);
    return;
  }
  throw new Error(`FAIL: ${msg}（rejectされなかった）`);
}

const userA = "00000000-0000-0000-0000-000000000010"; // 作成者/admin
const userB = "00000000-0000-0000-0000-000000000011"; // 招待を承諾
const userC = "00000000-0000-0000-0000-000000000012"; // 招待を辞退
const userD = "00000000-0000-0000-0000-000000000013"; // 承諾後adminに昇格
const userE = "00000000-0000-0000-0000-000000000014"; // 承諾後kickされる
const userF = "00000000-0000-0000-0000-000000000015"; // 競合テスト用: 2admin中の1人
const userG = "00000000-0000-0000-0000-000000000016"; // 競合テスト用: 2admin中の1人
const allUsers = [userA, userB, userC, userD, userE, userF, userG];

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
  await prisma.user.createMany({
    data: [
      { id: userA, nickname: "VerifyGroupsAdmin" },
      { id: userB, nickname: "VerifyGroupsAccepts" },
      { id: userC, nickname: "VerifyGroupsDeclines" },
      { id: userD, nickname: "VerifyGroupsPromoted" },
      { id: userE, nickname: "VerifyGroupsKicked" },
      { id: userF, nickname: "VerifyGroupsRaceA" },
      { id: userG, nickname: "VerifyGroupsRaceB" },
    ],
  });

  await assertRejects(
    () =>
      withRlsContext(userA, (tx) =>
        tx.$executeRaw`SELECT create_group(${"あ".repeat(51)}, NULL)`,
      ),
    "create_group: 51文字のnameは拒否される",
  );
  await assertRejects(
    () => withRlsContext(userA, (tx) => tx.$executeRaw`SELECT create_group('   ', NULL)`),
    "create_group: 空白のみのnameは拒否される",
  );

  const [group] = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Verify Groups Test', NULL)`,
  );

  // --- create_group_invite_link / revoke_group_invite_link: admin以外は拒否 ---
  await assertRejects(
    () =>
      withRlsContext(userB, (tx) =>
        tx.$queryRaw`SELECT * FROM create_group_invite_link(${group.id}::uuid)`,
      ),
    "create_group_invite_link: admin以外は拒否される",
  );
  await assertRejects(
    () =>
      withRlsContext(userB, (tx) =>
        tx.$executeRaw`SELECT revoke_group_invite_link(${group.id}::uuid)`,
      ),
    "revoke_group_invite_link: admin以外は拒否される",
  );

  // --- create_group_invite_link: 発行、再発行で旧コードが無効化される ---
  const [link1] = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<GroupInviteLinkRow[]>`SELECT * FROM create_group_invite_link(${group.id}::uuid)`,
  );
  assert(link1.group_id === group.id, "create_group_invite_link: 発行できる");

  const [link2] = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<GroupInviteLinkRow[]>`SELECT * FROM create_group_invite_link(${group.id}::uuid)`,
  );
  assert(
    link2.code !== link1.code,
    "create_group_invite_link: 再発行すると別コードになる（upsert）",
  );
  await assertRejects(
    () =>
      withRlsContext(userB, (tx) =>
        tx.$queryRaw`SELECT * FROM join_group_via_invite_link(${link1.code})`,
      ),
    "join_group_via_invite_link: 再発行前の旧コードは無効になる",
  );

  // --- join_group_via_invite_link: 無効なコードは拒否される ---
  await assertRejects(
    () =>
      withRlsContext(userB, (tx) =>
        tx.$queryRaw`SELECT * FROM join_group_via_invite_link('this-code-does-not-exist')`,
      ),
    "join_group_via_invite_link: 存在しないコードは拒否される",
  );

  // --- join_group_via_invite_link: 新規参加（userB/C/D/E） ---
  for (const target of [userB, userC, userD, userE]) {
    const [joined] = await withRlsContext(target, (tx) =>
      tx.$queryRaw<GroupMemberRow[]>`SELECT * FROM join_group_via_invite_link(${link2.code})`,
    );
    assert(
      joined.status === "active" && joined.joined_at !== null,
      `join_group_via_invite_link: ${target} が直接activeで参加できる`,
    );
  }
  const newMemberWallet = await prisma.wallet.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userB } },
  });
  assert(
    newMemberWallet !== null && newMemberWallet.balance === 0,
    "join_group_via_invite_link: 新規参加時にwalletが作成される（balance=0）",
  );

  // --- join_group_via_invite_link: 既にactiveなら二重参加エラーにせずno-op ---
  const [rejoinNoop] = await withRlsContext(userB, (tx) =>
    tx.$queryRaw<GroupMemberRow[]>`SELECT * FROM join_group_via_invite_link(${link2.code})`,
  );
  assert(
    rejoinNoop.status === "active",
    "join_group_via_invite_link: 既にactiveなユーザーはno-opで成功する（二重参加エラーにしない）",
  );

  // --- getGroup相当（features/groups/server/get-group.ts）: RLSでmember以外はnull ---
  const groupAsMember = await withRlsContext(userA, (tx) =>
    tx.group.findUnique({ where: { id: group.id } }),
  );
  assert(
    groupAsMember?.id === group.id,
    "getGroup相当: 所属memberはgroupを取得できる",
  );
  const groupAsNonMember = await withRlsContext(userF, (tx) =>
    tx.group.findUnique({ where: { id: group.id } }),
  );
  assert(
    groupAsNonMember === null,
    "getGroup相当: 非member（userF）にはnullが返る（RLS）",
  );

  // --- listGroupMembers相当（features/groups/server/list-group-members.ts） ---
  const memberRows = await withRlsContext(userA, (tx) =>
    tx.groupMember.findMany({
      where: { groupId: group.id, status: "active" },
      include: { user: { select: { id: true, nickname: true, avatarPath: true } } },
    }),
  );
  assert(
    memberRows.some((m) => m.userId === userA && m.user.nickname === "VerifyGroupsAdmin"),
    "listGroupMembers相当: メンバーのnicknameがuser joinで取得できる",
  );
  assert(
    memberRows.length === 5 &&
      [userA, userB, userC, userD, userE].every((id) =>
        memberRows.some((m) => m.userId === id),
      ),
    "listGroupMembers相当: activeな5人（admin+新規参加4人）がすべて含まれる",
  );

  // --- update_group_member_role ---
  await withRlsContext(userA, (tx) =>
    tx.$executeRaw`SELECT update_group_member_role(${group.id}::uuid, ${userD}::uuid, 'admin'::member_role)`,
  );
  const promoted = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userD } },
  });
  assert(promoted?.role === "admin", "update_group_member_role: memberをadminに昇格できる");

  // --- kick_group_member ---
  await assertRejects(
    () =>
      withRlsContext(userA, (tx) =>
        tx.$executeRaw`SELECT kick_group_member(${group.id}::uuid, ${userA}::uuid)`,
      ),
    "kick_group_member: 自分自身はkickできない",
  );
  await withRlsContext(userA, (tx) =>
    tx.$executeRaw`SELECT kick_group_member(${group.id}::uuid, ${userE}::uuid)`,
  );
  const kicked = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userE } },
  });
  assert(kicked?.status === "kicked", "kick_group_member: statusがkickedになる");
  const kickedWallet = await prisma.wallet.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userE } },
  });
  assert(
    kickedWallet !== null && kickedWallet.expiredAt !== null,
    "kick_group_member: walletがexpireされる",
  );

  // --- leave_group ---
  await withRlsContext(userB, (tx) => tx.$executeRaw`SELECT leave_group(${group.id}::uuid)`);
  const left = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userB } },
  });
  assert(left?.status === "left", "leave_group: statusがleftになる");

  // --- join_group_via_invite_link: 脱退後の再参加でwalletのbalanceが0にリセットされる ---
  // （直接RPCでbalanceを動かす経路がないため、テストのセットアップとしてのみ
  // prisma経由で直接balanceを書き換える。他のverifyスクリプトと同じパターン
  // [scripts/verify-wallet.mts参照]）
  await prisma.wallet.update({
    where: { groupId_userId: { groupId: group.id, userId: userB } },
    data: { balance: 500 },
  });
  const [rejoined] = await withRlsContext(userB, (tx) =>
    tx.$queryRaw<GroupMemberRow[]>`SELECT * FROM join_group_via_invite_link(${link2.code})`,
  );
  assert(
    rejoined.status === "active" && rejoined.left_at === null,
    "join_group_via_invite_link: 脱退後も再参加でactiveに戻る",
  );
  const rejoinedWallet = await prisma.wallet.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userB } },
  });
  assert(
    rejoinedWallet !== null && rejoinedWallet.balance === 0 && rejoinedWallet.expiredAt === null,
    "join_group_via_invite_link: 再参加時にwallet balanceが0にリセットされる（ポイント非持ち越し）",
  );

  // --- 最後のadminは降格/kick/脱退できない（userA, userDの2admin中1人を先に落とす） ---
  await withRlsContext(userA, (tx) =>
    tx.$executeRaw`SELECT update_group_member_role(${group.id}::uuid, ${userD}::uuid, 'member'::member_role)`,
  ); // 残りadminはuserAのみに
  await assertRejects(
    () => withRlsContext(userA, (tx) => tx.$executeRaw`SELECT leave_group(${group.id}::uuid)`),
    "leave_group: 最後のadminは脱退できない",
  );
  await assertRejects(
    () =>
      withRlsContext(userA, (tx) =>
        tx.$executeRaw`SELECT update_group_member_role(${group.id}::uuid, ${userA}::uuid, 'member'::member_role)`,
      ),
    "update_group_member_role: 最後のadminは降格できない",
  );

  // --- group_invite_links RLS: adminのみselect可 ---
  const linkAsAdmin = await withRlsContext(userA, (tx) =>
    tx.groupInviteLink.findUnique({ where: { groupId: group.id } }),
  );
  assert(linkAsAdmin !== null, "group_invite_links: adminは招待リンクをselectできる");
  const linkAsMember = await withRlsContext(userC, (tx) =>
    tx.groupInviteLink.findUnique({ where: { groupId: group.id } }),
  );
  assert(
    linkAsMember === null,
    "group_invite_links: admin以外はRLSでselectできない（null）",
  );

  // --- revoke_group_invite_link: 取り消し後は行が消え、旧コードは無効になる ---
  await withRlsContext(userA, (tx) =>
    tx.$executeRaw`SELECT revoke_group_invite_link(${group.id}::uuid)`,
  );
  const linkAfterRevoke = await prisma.groupInviteLink.findUnique({
    where: { groupId: group.id },
  });
  assert(linkAfterRevoke === null, "revoke_group_invite_link: 行が削除される");
  await assertRejects(
    () =>
      withRlsContext(userC, (tx) =>
        tx.$queryRaw`SELECT * FROM join_group_via_invite_link(${link2.code})`,
      ),
    "join_group_via_invite_link: 取り消し済みのコードは無効になる",
  );

  // --- 「最後のadmin」ガードの競合ケース（レビュー指摘: 2026-08-19） ---
  // leave_group/update_group_member_role/kick_group_memberは「他にadminが
  // count(*)人いる」を確認してから別行を更新するため、admin A/Bが同時に
  // 互いを脱退させると、両トランザクションがそれぞれ「他に1人adminがいる」と
  // 見て通過し、active adminが0人になりうるTOCTOU競合があった
  // （prisma/sql/groups/006_membership_lifecycle.sqlのgroups行FOR UPDATEロックで
  // 対処済み）。ここでは2admin構成のグループでuserF/userGが同時にleave_groupを
  // 呼び、片方だけ成功し最終的にactive adminが1人残ることを確認する。
  const [raceGroup] = await withRlsContext(userF, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Verify Groups Race Test', NULL)`,
  );
  const [raceLink] = await withRlsContext(userF, (tx) =>
    tx.$queryRaw<GroupInviteLinkRow[]>`SELECT * FROM create_group_invite_link(${raceGroup.id}::uuid)`,
  );
  await withRlsContext(userG, (tx) =>
    tx.$queryRaw`SELECT * FROM join_group_via_invite_link(${raceLink.code})`,
  );
  await withRlsContext(userF, (tx) =>
    tx.$executeRaw`SELECT update_group_member_role(${raceGroup.id}::uuid, ${userG}::uuid, 'admin'::member_role)`,
  );

  const raceResults = await Promise.allSettled([
    withRlsContext(userF, (tx) => tx.$executeRaw`SELECT leave_group(${raceGroup.id}::uuid)`),
    withRlsContext(userG, (tx) => tx.$executeRaw`SELECT leave_group(${raceGroup.id}::uuid)`),
  ]);
  const succeeded = raceResults.filter((r) => r.status === "fulfilled").length;
  assert(succeeded === 1, "leave_groupの同時実行: 2adminのうち片方だけ成功する");

  const remainingAdmins = await prisma.groupMember.count({
    where: { groupId: raceGroup.id, status: "active", role: "admin" },
  });
  assert(
    remainingAdmins === 1,
    "leave_groupの同時実行後もactive adminが1人残っている（0人にならない）",
  );

  // ロック機構そのものの決定的な検証（上記関数コメント参照）。
  const wasBlocked = await verifyForUpdateBlocks(raceGroup.id);
  assert(
    wasBlocked,
    "groups行のFOR UPDATEロックは別トランザクションを実際にブロックする",
  );

  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.walletLedger.deleteMany({ where: { userId: { in: allUsers } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: allUsers } } });
    await prisma.groupInviteLink.deleteMany({
      where: { createdBy: { in: [userA, userF] } },
    });
    await prisma.groupMember.deleteMany({ where: { userId: { in: allUsers } } });
    await prisma.group.deleteMany({ where: { createdBy: { in: [userA, userF] } } });
    await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
    await prisma.$disconnect();
  });

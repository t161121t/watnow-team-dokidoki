/**
 * prisma/sql/groups/*.sql のうち、scripts/verify-rls.mts でカバーしていない
 * search_users/decline_invite/leave_group/update_group_member_role/
 * kick_group_member、および「最後のadminは操作できない」系のガードを実DBに対して
 * 検証する。Vitest等の自動テストは未導入（技術選定.md参照）のため、暫定的に
 * ここに置く。
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
import type { UserSearchResultRow } from "@/features/groups/types";

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

  // --- search_users ---
  const found = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<UserSearchResultRow[]>`SELECT * FROM search_users(${group.id}::uuid, 'VerifyGroups')`,
  );
  assert(
    found.some((u) => u.id === userB) && found.some((u) => u.id === userC),
    "search_users: 未招待ユーザーが検索結果に含まれる",
  );
  await assertRejects(
    () =>
      withRlsContext(userA, (tx) =>
        tx.$queryRaw`SELECT * FROM search_users(${group.id}::uuid, 'a')`,
      ),
    "search_users: 1文字クエリは拒否される（RPC内チェック）",
  );

  // --- invite_member / accept_invite / decline_invite ---
  for (const target of [userB, userC, userD, userE]) {
    await withRlsContext(userA, (tx) =>
      tx.$executeRaw`SELECT invite_member(${group.id}::uuid, ${target}::uuid)`,
    );
  }
  await withRlsContext(userB, (tx) => tx.$executeRaw`SELECT accept_invite(${group.id}::uuid)`);
  await withRlsContext(userC, (tx) => tx.$executeRaw`SELECT decline_invite(${group.id}::uuid)`);
  await withRlsContext(userD, (tx) => tx.$executeRaw`SELECT accept_invite(${group.id}::uuid)`);
  await withRlsContext(userE, (tx) => tx.$executeRaw`SELECT accept_invite(${group.id}::uuid)`);

  const afterInvites = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<UserSearchResultRow[]>`SELECT * FROM search_users(${group.id}::uuid, 'VerifyGroups')`,
  );
  assert(
    !afterInvites.some((u) => u.id === userB) &&
      !afterInvites.some((u) => u.id === userD) &&
      !afterInvites.some((u) => u.id === userE),
    "search_users: 参加済みメンバーは検索結果から除外される",
  );
  assert(
    afterInvites.some((u) => u.id === userC),
    "search_users: declineしたユーザーは再度検索結果に出てくる（membershipが残らない）",
  );

  const declinedMember = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: userC } },
  });
  assert(declinedMember === null, "decline_invite: group_members行が削除される");

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
  await withRlsContext(userF, (tx) =>
    tx.$executeRaw`SELECT invite_member(${raceGroup.id}::uuid, ${userG}::uuid)`,
  );
  await withRlsContext(userG, (tx) => tx.$executeRaw`SELECT accept_invite(${raceGroup.id}::uuid)`);
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
    await prisma.groupMember.deleteMany({ where: { userId: { in: allUsers } } });
    await prisma.group.deleteMany({ where: { createdBy: { in: [userA, userF] } } });
    await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
    await prisma.$disconnect();
  });

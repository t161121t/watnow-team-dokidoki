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
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";
import type { UserSearchResultRow } from "@/features/groups/types";

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
const allUsers = [userA, userB, userC, userD, userE];

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
  await prisma.user.createMany({
    data: [
      { id: userA, nickname: "VerifyGroupsAdmin" },
      { id: userB, nickname: "VerifyGroupsAccepts" },
      { id: userC, nickname: "VerifyGroupsDeclines" },
      { id: userD, nickname: "VerifyGroupsPromoted" },
      { id: userE, nickname: "VerifyGroupsKicked" },
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
  assert(kickedWallet?.expiredAt !== null, "kick_group_member: walletがexpireされる");

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
    await prisma.group.deleteMany({ where: { createdBy: userA } });
    await prisma.user.deleteMany({ where: { id: { in: allUsers } } });
    await prisma.$disconnect();
  });

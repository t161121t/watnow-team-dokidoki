/**
 * withRlsContext（lib/db/rls.ts）が実DBに対して正しくRLSを効かせるかの手動検証スクリプト。
 * Vitest等の自動テストは未導入（技術選定.md参照）のため、暫定的にここに置く。
 * 本物のDBに対してテストユーザーを作成・削除するため、実行は開発用DBに対してのみ行うこと。
 *
 * 実行: npm run verify:rls
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

const userA = "00000000-0000-0000-0000-0000000000aa";
const userB = "00000000-0000-0000-0000-0000000000bb";

async function main() {
  // セットアップ（postgres特権で直接作成。RLSテストの前提データ）
  await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
  await prisma.user.createMany({
    data: [
      { id: userA, nickname: "Alice" },
      { id: userB, nickname: "Bob" },
    ],
  });

  // 1. User A が create_group RPC を叩く（withRlsContext経由）
  const group = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<{ id: string; name: string }[]>`SELECT * FROM create_group('Test Group', NULL)`,
  );
  const groupId = group[0].id;
  assert(group[0].name === "Test Group", "create_group で groups 行が作成される");

  // 2. group_members / wallets が作成されているか（管理側で確認）
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: userA } },
  });
  assert(member?.role === "admin" && member?.status === "active", "作成者が active admin になっている");

  const wallet = await prisma.wallet.findUnique({
    where: { groupId_userId: { groupId, userId: userA } },
  });
  assert(wallet?.balance === 0, "wallet が balance=0 で作成される");

  // 3. User B（未参加）は groups を見えない（RLSで0件になるはず）
  const groupsForB = await withRlsContext(userB, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT id FROM groups WHERE id = ${groupId}::uuid`,
  );
  assert(groupsForB.length === 0, "非メンバーの User B には groups が見えない（RLS）");

  // 4. User B は User A の wallet を見えない
  const walletForB = await withRlsContext(userB, (tx) =>
    tx.$queryRaw<{ balance: number }[]>`SELECT balance FROM wallets WHERE group_id = ${groupId}::uuid AND user_id = ${userA}::uuid`,
  );
  assert(walletForB.length === 0, "User B は User A の wallet を見えない（RLS）");

  // 5. User A 自身は自分の wallet を見える
  const walletForA = await withRlsContext(userA, (tx) =>
    tx.$queryRaw<{ balance: number }[]>`SELECT balance FROM wallets WHERE group_id = ${groupId}::uuid AND user_id = ${userA}::uuid`,
  );
  assert(walletForA.length === 1 && walletForA[0].balance === 0, "User A は自分の wallet を見える");

  // 6. invite_member: User A が User B を招待
  await withRlsContext(userA, (tx) =>
    tx.$executeRaw`SELECT invite_member(${groupId}::uuid, ${userB}::uuid)`,
  );
  const invited = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: userB } },
  });
  assert(invited?.status === "invited", "invite_member で status=invited の行ができる");

  // 7. User B は自分の招待行だけ見える（他メンバー一覧は見えない）
  const rosterForInvitedB = await withRlsContext(userB, (tx) =>
    tx.$queryRaw<{ user_id: string }[]>`SELECT user_id FROM group_members WHERE group_id = ${groupId}::uuid`,
  );
  assert(
    rosterForInvitedB.length === 1 && rosterForInvitedB[0].user_id === userB,
    "invited中のUser Bは自分の招待行しか見えない",
  );

  // 8. User B が accept_invite
  await withRlsContext(userB, (tx) =>
    tx.$executeRaw`SELECT accept_invite(${groupId}::uuid)`,
  );
  const activeB = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId: userB } },
  });
  assert(activeB?.status === "active", "accept_invite で status=active になる");

  const walletB = await prisma.wallet.findUnique({
    where: { groupId_userId: { groupId, userId: userB } },
  });
  assert(walletB?.balance === 0, "accept_invite で wallet が作成される");

  // 9. active化後は User B もロースター全体・グループを見える
  const rosterForActiveB = await withRlsContext(userB, (tx) =>
    tx.$queryRaw<{ user_id: string }[]>`SELECT user_id FROM group_members WHERE group_id = ${groupId}::uuid`,
  );
  assert(rosterForActiveB.length === 2, "activeになったUser Bはロースター全体を見える");

  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    // 後片付け（テストユーザー・関連データを削除）
    await prisma.walletLedger.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.groupMember.deleteMany({ where: { userId: { in: [userA, userB] } } });
    await prisma.group.deleteMany({ where: { createdBy: userA } });
    await prisma.user.deleteMany({ where: { id: { in: [userA, userB] } } });
    await prisma.$disconnect();
  });

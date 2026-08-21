/**
 * features/wallet/server/get-dealer-decline-history.ts（get_dealer_decline_history
 * RPC）と get-wallet-ledger-history.ts（素のPrismaクエリ）を実DBに対して検証する。
 * get-balance.tsはscripts/verify-rls.mtsで既に検証済み（features/wallet/server/
 * get-balance.tsのコメント参照）のためここでは対象外。
 *
 * 実行: npm run verify:wallet
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";

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

const seller = "00000000-0000-0000-0000-000000000050"; // 出品者（admin）
const dealer1 = "00000000-0000-0000-0000-000000000051"; // 最初に選ばれ、辞退する
const dealer2 = "00000000-0000-0000-0000-000000000052"; // 辞退後に再割当される候補
const member = "00000000-0000-0000-0000-000000000053"; // 出品者でもadminでもない一般member
const outsider = "00000000-0000-0000-0000-000000000054"; // どのグループにも属さない
const users = [seller, dealer1, dealer2, member, outsider];

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.user.createMany({
    data: users.map((id, i) => ({ id, nickname: `WalletTest${i}` })),
  });

  const [group] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Wallet Test Group', NULL)`,
  );
  const groupId = group.id;

  for (const uid of [dealer1, dealer2, member]) {
    await prisma.groupMember.create({
      data: { groupId, userId: uid, role: "member", status: "active", invitedBy: seller, joinedAt: new Date() },
    });
    await prisma.wallet.create({ data: { groupId, userId: uid, balance: 200 } });
  }

  // --- dealer1が選ばれるまでリトライして辞退させ、dealer_decline_feeのwallet_ledgerを作る ---
  const [item] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string }[]>`
      SELECT * FROM register_secret(${groupId}::uuid, 'body', 'summary', 'category', ${3}, ${100})
    `,
  );

  let auctionId = "";
  let assignedDealer = "";
  for (let i = 0; i < 30; i++) {
    await prisma.auction.deleteMany({ where: { secretGroupItemId: item.id } });
    await prisma.secretGroupItem.update({
      where: { id: item.id },
      data: { status: "registered", currentValue: 100 },
    });
    await prisma.wallet.update({ where: { groupId_userId: { groupId, userId: seller } }, data: { balance: 0 } });
    const [auction] = await withRlsContext(seller, (tx) =>
      tx.$queryRaw<{ id: string; dealer_id: string }[]>`SELECT * FROM list_secret_for_auction(${item.id}::uuid)`,
    );
    auctionId = auction.id;
    assignedDealer = auction.dealer_id;
    if (assignedDealer === dealer1) break;
  }
  assert(assignedDealer === dealer1, "前提: list_secret_for_auctionでdealer1が選抜される");

  await withRlsContext(dealer1, (tx) => tx.$executeRaw`SELECT decline_dealer(${auctionId}::uuid)`);

  // --- get_dealer_decline_history ---
  await assertRejects(
    () => withRlsContext(member, (tx) => tx.$executeRaw`SELECT get_dealer_decline_history(${auctionId}::uuid)`),
    "get_dealer_decline_history: 出品者でもadminでもないmemberは見られない",
  );
  await assertRejects(
    () => withRlsContext(outsider, (tx) => tx.$executeRaw`SELECT get_dealer_decline_history(${auctionId}::uuid)`),
    "get_dealer_decline_history: グループ外は見られない",
  );

  const historyForSeller = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ dealer_id: string; fee_amount: number; declined_at: Date }[]>`
      SELECT * FROM get_dealer_decline_history(${auctionId}::uuid)
    `,
  );
  assert(historyForSeller.length === 1, "get_dealer_decline_history: 出品者本人は辞退履歴が1件見える");
  assert(historyForSeller[0].dealer_id === dealer1, "get_dealer_decline_history: dealer_idがdealer1になる");
  assert(historyForSeller[0].fee_amount === 5, "get_dealer_decline_history: fee_amountが5pt（前払い100の5%）になる");

  // is_group_adminの分岐を出品者判定と分離して検証するため、seller以外のmemberを
  // 一時的にadminに昇格させてから呼ぶ（sellerで検証すると出品者判定と常に同時に
  // 真になってしまい、admin経路単体を切り分けられない。PR #56のCodexレビュー
  // 指摘と同種のガード分離ミスを避けるため）。
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: member } },
    data: { role: "admin" },
  });
  const historyForAdmin = await withRlsContext(member, (tx) =>
    tx.$queryRaw<{ dealer_id: string }[]>`SELECT * FROM get_dealer_decline_history(${auctionId}::uuid)`,
  );
  assert(
    historyForAdmin.length === 1,
    "get_dealer_decline_history: 出品者本人でなくてもgroup adminなら見える",
  );
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: member } },
    data: { role: "member" },
  });

  // --- getWalletLedgerHistory相当（素のPrismaクエリ） ---
  const dealer1History = await withRlsContext(dealer1, (tx) =>
    tx.walletLedger.findMany({
      where: { groupId, userId: dealer1 },
      orderBy: { createdAt: "desc" },
    }),
  );
  assert(dealer1History.length === 1, "getWalletLedgerHistory相当: dealer1本人の履歴が1件見える");
  assert(dealer1History[0].kind === "dealer_decline_fee", "getWalletLedgerHistory相当: kindがdealer_decline_feeになる");
  assert(dealer1History[0].amount === -5, "getWalletLedgerHistory相当: amountが-5（debit）になる");

  const memberHistory = await withRlsContext(member, (tx) =>
    tx.walletLedger.findMany({
      where: { groupId, userId: member },
      orderBy: { createdAt: "desc" },
    }),
  );
  assert(memberHistory.length === 0, "getWalletLedgerHistory相当: 履歴が無いユーザーは0件");

  console.log("\nALL CHECKS PASSED");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.bid.deleteMany({ where: { bidderId: { in: users } } });
    await prisma.auction.deleteMany({ where: { sellerId: seller } });
    await prisma.secretGroupItem.deleteMany({ where: { secret: { ownerId: seller } } });
    await prisma.secret.deleteMany({ where: { ownerId: seller } });
    await prisma.walletLedger.deleteMany({ where: { userId: { in: users } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: users } } });
    await prisma.groupMember.deleteMany({ where: { userId: { in: users } } });
    await prisma.group.deleteMany({ where: { createdBy: seller } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  });

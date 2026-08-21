/**
 * features/auctions/server/* → prisma/sql/auctions/*.sql のうち、
 * scripts/verify-auction-flow.mts でカバーしていないdecline_dealer、
 * 3つのView（auction_public_view / bidder_identified_view /
 * anonymous_bid_feed_view）、place_bidの各種ガード（自出品/ディーラー本人/
 * 現在価格以下/残高不足）を実DBに対して検証する。Vitest等の自動テストは
 * 未導入（技術選定.md参照）のため、暫定的にここに置く。
 *
 * 他のverifyスクリプトと同様、RPC/ViewはwithRlsContext経由の生SQLで直接叩く
 * （features/auctions/server/*はserver-onlyが付いておりtsx実行環境からは
 * importできないため。呼び出しているSQL文自体は同一）。
 *
 * 実行: npm run verify:auctions
 *
 * 2026-08-20: 実装時にサンドボックス環境からSupabase開発用DBへの直接接続が
 * 到達不能だったため、このスクリプト自体はまだ実行できていない（プロジェクト
 * 自体は稼働中。サンドボックス固有のネットワーク/DNS問題と判明）。
 * 代わりにSupabase MCPのapply_migration（一時的な書き込み→即削除）で
 * このスクリプトと同じ検証項目を実施し、全項目パスを確認済み（PR #56参照）。
 * サンドボックスの直接DB接続が復旧したら、このスクリプト自体も一度実行して
 * 二重に確認すること（特にbid_count/rankのJS型は未検証。下記types.ts参照）。
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

const seller = "00000000-0000-0000-0000-000000000030";
const dealer1 = "00000000-0000-0000-0000-000000000031"; // 最初に選ばれ、辞退する
const dealer2 = "00000000-0000-0000-0000-000000000032"; // 辞退後に再割当される
const bidder = "00000000-0000-0000-0000-000000000033";
const outsider = "00000000-0000-0000-0000-000000000034"; // どのグループにも属さない
const users = [seller, dealer1, dealer2, bidder, outsider];

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.user.createMany({
    data: users.map((id, i) => ({ id, nickname: `AuctionsTest${i}` })),
  });

  const [group] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Auctions Test Group', NULL)`,
  );
  const groupId = group.id;

  for (const uid of [dealer1, dealer2, bidder]) {
    await prisma.groupMember.create({
      data: { groupId, userId: uid, role: "member", status: "active", invitedBy: seller, joinedAt: new Date() },
    });
    await prisma.wallet.create({ data: { groupId, userId: uid, balance: 200 } });
  }

  // --- 出品（dealer1が選ばれるまでリトライ。プールはdealer1/dealer2/bidderの3人） ---
  const [item] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string; secret_id: string }[]>`
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
  assert(assignedDealer === dealer1, "list_secret_for_auction: dealer1がランダム選抜される");

  // --- decline_dealer ---
  await assertRejects(
    () => withRlsContext(dealer2, (tx) => tx.$executeRaw`SELECT decline_dealer(${auctionId}::uuid)`),
    "decline_dealer: 割り当てられていないディーラーは辞退できない",
  );
  await assertRejects(
    () => withRlsContext(outsider, (tx) => tx.$executeRaw`SELECT decline_dealer(${auctionId}::uuid)`),
    "decline_dealer: グループ外は辞退できない",
  );

  const dealer1WalletBefore = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: dealer1 } },
  });
  const [declinedAuction] = await withRlsContext(dealer1, (tx) =>
    tx.$queryRaw<{ dealer_id: string; status: string }[]>`SELECT * FROM decline_dealer(${auctionId}::uuid)`,
  );
  assert(
    declinedAuction.status === "pending_dealer_approval",
    "decline_dealer: statusはpending_dealer_approvalのまま",
  );
  assert(
    declinedAuction.dealer_id === dealer2 || declinedAuction.dealer_id === bidder,
    "decline_dealer: 別の候補（dealer2かbidder）に再割当される",
  );

  const dealer1WalletAfter = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: dealer1 } },
  });
  assert(
    dealer1WalletAfter.balance === dealer1WalletBefore.balance - 5, // 前払い100の5% = 5
    `decline_dealer: dealer1に辞退料5%(5pt)が課される（実際の差分:${dealer1WalletBefore.balance - dealer1WalletAfter.balance}）`,
  );

  // 以降のテストのため、確実にdealer1をdealerに固定し直す（再割当後の状態を上書き）
  await prisma.auction.update({ where: { id: auctionId }, data: { dealerId: dealer1 } });

  // --- approve_dealer_assignment ---
  await assertRejects(
    () => withRlsContext(bidder, (tx) => tx.$executeRaw`SELECT approve_dealer_assignment(${auctionId}::uuid)`),
    "approve_dealer_assignment: ディーラー以外は承認できない",
  );
  const [approved] = await withRlsContext(dealer1, (tx) =>
    tx.$queryRaw<{ status: string; starts_at: Date; ends_at: Date }[]>`
      SELECT * FROM approve_dealer_assignment(${auctionId}::uuid)
    `,
  );
  assert(approved.status === "open", "approve_dealer_assignment: statusがopenになる");
  assert(approved.starts_at !== null && approved.ends_at !== null, "approve_dealer_assignment: starts_at/ends_atが確定する");

  const itemAfterApproval = await prisma.secretGroupItem.findUniqueOrThrow({ where: { id: item.id } });
  assert(itemAfterApproval.status === "on_auction", "approve_dealer_assignment: secret_group_itemsがon_auctionになる");

  // --- place_bid のガード ---
  await assertRejects(
    () => withRlsContext(seller, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, ${110}::int)`),
    "place_bid: 出品者は自出品に入札できない",
  );
  await assertRejects(
    () => withRlsContext(dealer1, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, ${110}::int)`),
    "place_bid: ディーラーは担当オークションに入札できない",
  );
  await assertRejects(
    () => withRlsContext(bidder, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, ${100}::int)`),
    "place_bid: 現在価格以下の入札は拒否される",
  );
  await prisma.wallet.update({ where: { groupId_userId: { groupId, userId: bidder } }, data: { balance: 50 } });
  await assertRejects(
    () => withRlsContext(bidder, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, ${110}::int)`),
    "place_bid: 残高不足の入札は拒否される",
  );
  await prisma.wallet.update({ where: { groupId_userId: { groupId, userId: bidder } }, data: { balance: 200 } });

  const [bid] = await withRlsContext(bidder, (tx) =>
    tx.$queryRaw<{ amount: number }[]>`SELECT * FROM place_bid(${auctionId}::uuid, ${110}::int)`,
  );
  assert(bid.amount === 110, "place_bid: 正常な入札が成功する");

  const auctionAfterBid = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
  assert(auctionAfterBid.currentPrice === 110, "place_bid: current_priceが更新される");

  // --- auction_public_view ---
  const publicView = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ auction_id: string; bid_count: string; current_price: number }[]>`
      SELECT * FROM auction_public_view WHERE auction_id = ${auctionId}::uuid
    `,
  );
  assert(publicView.length === 1, "auction_public_view: グループメンバーから見える");
  assert(Number(publicView[0].bid_count) === 1, "auction_public_view: bid_countが正しい");
  assert(publicView[0].current_price === 110, "auction_public_view: current_priceが正しい");

  const publicViewForOutsider = await withRlsContext(outsider, (tx) =>
    tx.$queryRaw<{ auction_id: string }[]>`
      SELECT * FROM auction_public_view WHERE auction_id = ${auctionId}::uuid
    `,
  );
  assert(publicViewForOutsider.length === 0, "auction_public_view: グループ外からは見えない");

  // --- bidder_identified_view ---
  const identifiedForSeller = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ bidder_id: string; bidder_nickname: string }[]>`
      SELECT * FROM bidder_identified_view WHERE auction_id = ${auctionId}::uuid
    `,
  );
  assert(
    identifiedForSeller.length === 1 && identifiedForSeller[0].bidder_id === bidder,
    "bidder_identified_view: 出品者は入札者を識別できる",
  );

  const identifiedForBidder = await withRlsContext(bidder, (tx) =>
    tx.$queryRaw<{ bidder_id: string }[]>`
      SELECT * FROM bidder_identified_view WHERE auction_id = ${auctionId}::uuid
    `,
  );
  assert(
    identifiedForBidder.length === 0,
    "bidder_identified_view: 出品者でもディーラーでもない入札者本人には見えない",
  );

  // --- anonymous_bid_feed_view ---
  const anonymousForBidder = await withRlsContext(bidder, (tx) =>
    tx.$queryRaw<{ amount: number; rank: string }[]>`
      SELECT * FROM anonymous_bid_feed_view WHERE auction_id = ${auctionId}::uuid
    `,
  );
  assert(
    anonymousForBidder.length === 1 && anonymousForBidder[0].amount === 110,
    "anonymous_bid_feed_view: 金額は見える（bidder_idは列に含まれない）",
  );
  assert(Number(anonymousForBidder[0].rank) === 1, "anonymous_bid_feed_view: rankが正しい");

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

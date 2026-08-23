/**
 * オークションの一番危険な処理（出品→ディーラー承認→入札→次点繰り上げ→按分credit）を
 * 実DBに対して通しで検証する手動スクリプト。Vitest等の自動テストは未導入のため暫定的に
 * ここに置く（docs/DB.md §13 テスト観点の「落札確定」「次点繰り上げ」に対応）。
 *
 * 実行: npm run verify:auction
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext, withServiceRole } from "@/lib/db/rls";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`OK: ${msg}`);
}

const seller = "00000000-0000-0000-0000-0000000000c1";
const dealer = "00000000-0000-0000-0000-0000000000c2";
const bidder1 = "00000000-0000-0000-0000-0000000000c3"; // 高額入札するが残高不足になる
const bidder2 = "00000000-0000-0000-0000-0000000000c4"; // 次点繰り上げで落札するはず
const users = [seller, dealer, bidder1, bidder2];

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.user.createMany({
    data: users.map((id, i) => ({ id, nickname: `AuctionTest${i}` })),
  });

  const [group] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Auction Test Group', NULL)`,
  );
  const groupId = group.id;

  // 出品者以外を直接 active member にする（招待フローはテスト済みなので今回は直接投入）
  for (const uid of [dealer, bidder1, bidder2]) {
    await prisma.groupMember.create({
      data: { groupId, userId: uid, role: "member", status: "active", invitedBy: seller, joinedAt: new Date() },
    });
    await prisma.wallet.create({ data: { groupId, userId: uid, balance: 0 } });
  }

  // place_bid時点では両者とも十分な残高を持たせる（入札自体はplace_bid時のbalanceチェックを通す）
  await prisma.wallet.update({ where: { groupId_userId: { groupId, userId: bidder1 } }, data: { balance: 200 } });
  await prisma.wallet.update({ where: { groupId_userId: { groupId, userId: bidder2 } }, data: { balance: 150 } });

  // 秘密を登録・出品（asking_price=100 → 前払い100がsellerに入る）
  const [item] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM register_secret(${groupId}::uuid, 'body', 'title', 'summary', 'category', 3, 100)`,
  );

  const sellerWalletAfterPrepay = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: seller } },
  });
  assert(sellerWalletAfterPrepay.balance === 0, "register_secretだけでは前払いされない（listed時点で発生）");

  // dealerを固定するため、list_secret_for_auction をリトライしてdealerになるまで回す
  // （groupメンバーがdealer/bidder1/bidder2の3人しかいないのでランダム選抜の結果を許容する）
  let auctionId = "";
  let assignedDealer = "";
  for (let i = 0; i < 20; i++) {
    await prisma.auction.deleteMany({ where: { secretGroupItem: { id: item.id } } });
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
    if (assignedDealer === dealer) break;
  }
  assert(assignedDealer === dealer, "dealerがランダム選抜される（テスト用にdealerロールを引くまでリトライ）");

  // 2026-08-23レビュー反映: 前払い（P4）のcreditはlist_secret_for_auctionでは
  // なくapprove_dealer_assignmentで行う（承認前に辞退が続き最終的に誰も
  // 承認できないケースで、出品者に前払いだけ残ってしまうのを防ぐため。
  // ユーザー報告で発覚。scripts/verify-auctions.mts・verify-secrets.mtsにも
  // 同種の検証あり）。
  const sellerWalletAfterListing = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: seller } },
  });
  assert(
    sellerWalletAfterListing.balance === 0,
    "list_secret_for_auction では前払いはまだcreditされない",
  );

  // ディーラー承認
  await withRlsContext(dealer, (tx) => tx.$executeRaw`SELECT approve_dealer_assignment(${auctionId}::uuid)`);
  const auctionAfterApproval = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
  assert(auctionAfterApproval.status === "open", "承認でopenになる");

  const sellerWalletAfterApproval = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: seller } },
  });
  assert(
    sellerWalletAfterApproval.balance === 100,
    `approve_dealer_assignment で前払い100が入る（P4、実際:${sellerWalletAfterApproval.balance}）`,
  );

  // 入札: bidder2が130で先に入札、bidder1が150で上回る（place_bidは現在価格超えが必須のため昇順で入札）
  await withRlsContext(bidder2, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, 130)`);
  await withRlsContext(bidder1, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, 150)`);

  // bidder1が別グループ相当で使い込んだ想定で、残高を100まで下げる（150払えなくする）
  await prisma.wallet.update({ where: { groupId_userId: { groupId, userId: bidder1 } }, data: { balance: 100 } });

  // 開始・終了時刻を両方過去にして確定処理を実行
  // （auctions_starts_ends_consistency CHECK制約: starts_at < ends_at を満たす必要がある）
  await prisma.auction.update({
    where: { id: auctionId },
    data: { startsAt: new Date(Date.now() - 2000), endsAt: new Date(Date.now() - 1000) },
  });

  // claim_auction_for_finalize/finalize_auction は authenticated へGRANTしていない
  // （service role専用。2026-08-18 PRレビュー反映）ため withServiceRole で叩く
  const claimed = await withServiceRole((tx) =>
    tx.$queryRaw<{ claim_auction_for_finalize: boolean }[]>`SELECT claim_auction_for_finalize(${auctionId}::uuid)`,
  );
  assert(claimed[0].claim_auction_for_finalize === true, "claim_auction_for_finalize が成功する");

  await withServiceRole((tx) => tx.$executeRaw`SELECT finalize_auction(${auctionId}::uuid)`);

  const finalAuction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
  assert(finalAuction.status === "sold", "finalize_auctionでsoldになる");
  assert(finalAuction.winnerId === bidder2, "残高不足のbidder1ではなく次点のbidder2が落札者になる（次点繰り上げ）");
  assert(finalAuction.finalPrice === 130, "final_priceは繰り上げ落札者自身の入札額(130)になる");

  const bidder2Wallet = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: bidder2 } },
  });
  assert(bidder2Wallet.balance === 150 - 130, "落札者から130 debitされる");

  const sellerFinal = await prisma.wallet.findUniqueOrThrow({ where: { groupId_userId: { groupId, userId: seller } } });
  const dealerFinal = await prisma.wallet.findUniqueOrThrow({ where: { groupId_userId: { groupId, userId: dealer } } });
  assert(sellerFinal.balance === 100 + 91, `seller は前払い100 + 按分70%(91) = 191 になる（実際:${sellerFinal.balance}）`);
  assert(dealerFinal.balance === 39, `dealer は按分30%(39) を得る（実際:${dealerFinal.balance}）`);

  const bidder1Bid = await prisma.bid.findFirstOrThrow({ where: { auctionId, bidderId: bidder1 } });
  assert(bidder1Bid.status === "failed", "残高不足だったbidder1のbidはfailedになる");

  console.log("\nALL AUCTION CHECKS PASSED");
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

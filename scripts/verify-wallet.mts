/**
 * features/wallet/server/get-dealer-decline-history.ts（get_dealer_decline_history
 * RPC）と get-wallet-ledger-history.ts（素のPrismaクエリ、ページネーション込み）を
 * 実DBに対して検証する。get-balance.tsはscripts/verify-rls.mtsで既に検証済み
 * （features/wallet/server/get-balance.tsのコメント参照）のためここでは対象外。
 *
 * server-onlyパッケージのexportsが"react-server"条件で空ファイルに解決される
 * 仕様を利用し、package.jsonのverify:walletで`tsx --conditions=react-server`を
 * 使うことで、features/wallet/server/*.tsを実際にimportして直接呼ぶ
 * （features/challenges/scripts/verify-challenges.mtsと同じ理由。2026-08-22
 * PRレビュー指摘: 生SQL/生Prismaクエリの再実装だとexportされた関数自体の
 * 引数順・配線が壊れていても気づけない）。
 *
 * 実行: npm run verify:wallet
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext } from "@/lib/db/rls";
import { getDealerDeclineHistory } from "@/features/wallet/server/get-dealer-decline-history";
import { getWalletLedgerHistory } from "@/features/wallet/server/get-wallet-ledger-history";

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
      SELECT * FROM register_secret(${groupId}::uuid, 'body', 'title', 'summary', 'category', ${3}, ${100})
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
    () => getDealerDeclineHistory(member, auctionId),
    "get_dealer_decline_history: 出品者でもadminでもないmemberは見られない",
  );
  await assertRejects(
    () => getDealerDeclineHistory(outsider, auctionId),
    "get_dealer_decline_history: グループ外は見られない",
  );

  const historyForSeller = await getDealerDeclineHistory(seller, auctionId);
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
  const historyForAdmin = await getDealerDeclineHistory(member, auctionId);
  assert(
    historyForAdmin.length === 1,
    "get_dealer_decline_history: 出品者本人でなくてもgroup adminなら見える",
  );
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: member } },
    data: { role: "member" },
  });

  // 2026-08-22 PRレビュー指摘: 出品者本人でも脱退/kick後は見えなくなることを
  // 確認する（is_group_memberチェックの追加。他のauction viewと同じ境界に揃える）
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: seller } },
    data: { status: "left" },
  });
  await assertRejects(
    () => getDealerDeclineHistory(seller, auctionId),
    "get_dealer_decline_history: 出品者本人でも脱退後は見られない",
  );
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId, userId: seller } },
    data: { status: "active" },
  });

  // --- getWalletLedgerHistory ---
  const dealer1History = await getWalletLedgerHistory(dealer1, groupId);
  assert(dealer1History.length === 1, "getWalletLedgerHistory: dealer1本人の履歴が1件見える");
  assert(dealer1History[0].kind === "dealer_decline_fee", "getWalletLedgerHistory: kindがdealer_decline_feeになる");
  assert(dealer1History[0].amount === -5, "getWalletLedgerHistory: amountが-5（debit）になる");

  const memberHistoryEmpty = await getWalletLedgerHistory(member, groupId);
  assert(memberHistoryEmpty.length === 0, "getWalletLedgerHistory: 履歴が無いユーザーは0件");

  // --- getWalletLedgerHistory: ページネーション ---
  // memberに5件のledgerを直接作成（createdAtをずらして順序を確定させる）
  const now = Date.now();
  await prisma.walletLedger.createMany({
    data: Array.from({ length: 5 }, (_, i) => ({
      groupId,
      userId: member,
      amount: 10,
      balanceAfter: 200 + (i + 1) * 10,
      kind: "challenge_reward" as const,
      createdAt: new Date(now + i * 1000),
    })),
  });

  const firstPage = await getWalletLedgerHistory(member, groupId, { limit: 2 });
  assert(firstPage.length === 2, `getWalletLedgerHistory: limit指定で件数を絞れる（実際:${firstPage.length}件）`);
  assert(
    firstPage[0].createdAt.getTime() > firstPage[1].createdAt.getTime(),
    "getWalletLedgerHistory: createdAt降順で返る",
  );

  const secondPage = await getWalletLedgerHistory(member, groupId, {
    limit: 2,
    cursor: firstPage[firstPage.length - 1].id,
  });
  assert(secondPage.length === 2, `getWalletLedgerHistory: cursorで次のページに進める（実際:${secondPage.length}件）`);
  assert(
    secondPage[0].createdAt.getTime() < firstPage[1].createdAt.getTime(),
    "getWalletLedgerHistory: 2ページ目は1ページ目より古いレコードになる",
  );
  const firstPageIds = new Set(firstPage.map((r) => r.id));
  assert(
    secondPage.every((r) => !firstPageIds.has(r.id)),
    "getWalletLedgerHistory: ページ間で重複が無い",
  );

  const allDefault = await getWalletLedgerHistory(member, groupId);
  assert(allDefault.length === 5, `getWalletLedgerHistory: limit省略時はデフォルト件数まで返る（実際:${allDefault.length}件）`);

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

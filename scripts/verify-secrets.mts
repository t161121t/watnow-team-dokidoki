/**
 * features/secrets/server/* → prisma/sql/secrets/*.sql の一連が実DBに対して
 * 正しく動くかの手動検証スクリプト。Vitest等の自動テストは未導入
 * （技術選定.md参照）のため、暫定的にここに置く。
 *
 * 他のverifyスクリプトと同様、RPCは`withRlsContext`経由の生SQLで直接叩く
 * （`features/secrets/server/*`は`server-only`が付いておりtsx実行環境からは
 * importできないため。呼び出しているSQL文自体は同一）。
 *
 * my_secret_collection_viewの「落札者」側の分岐を検証するため、
 * scripts/verify-auction-flow.mtsと同様にオークションをsoldまで進める
 * （出品側のscriptなので、次点繰り上げ等auctions側の詳細検証は
 * verify-auction-flow.mtsに任せ、ここでは1人入札の単純なケースのみ）。
 *
 * 実行: npm run verify:secrets
 */
import "dotenv/config";
import { prisma } from "@/lib/prisma";
import { withRlsContext, withServiceRole } from "@/lib/db/rls";

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

const seller = "00000000-0000-0000-0000-000000000020";
const dealer = "00000000-0000-0000-0000-000000000021";
const bidder = "00000000-0000-0000-0000-000000000022";
const outsider = "00000000-0000-0000-0000-000000000023"; // どのグループにも属さない
const users = [seller, dealer, bidder, outsider];

async function main() {
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  await prisma.user.createMany({
    data: users.map((id, i) => ({ id, nickname: `SecretsTest${i}` })),
  });

  const [group] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string }[]>`SELECT * FROM create_group('Secrets Test Group', NULL)`,
  );
  const groupId = group.id;

  for (const uid of [dealer, bidder]) {
    await prisma.groupMember.create({
      data: { groupId, userId: uid, role: "member", status: "active", invitedBy: seller, joinedAt: new Date() },
    });
    await prisma.wallet.create({ data: { groupId, userId: uid, balance: 200 } });
  }

  // --- register_secret ---
  // rarity/askingPriceはJS number変数を補間して呼ぶ（features/secrets/server/
  // register-secret.tsの実際の呼び出し方と揃える）。SQLリテラルで直接書くと、
  // PrismaのパラメータバインディングでJS numberがPostgres側でint8としてbindされ
  // register_secret（int4引数）の関数解決に失敗しうる問題を検知できないため
  // （2026-08-19レビュー指摘。register-secret.ts/update-secret-before-listing.ts
  // に::intキャストを追加して対応。手元の検証ではキャスト無しでも成功したが、
  // 念のため明示した）。
  const validRarity = 3;
  const outOfRangeRarity = 6;
  const validAskingPrice = 100;
  const negativeAskingPrice = -1;

  await assertRejects(
    () =>
      withRlsContext(outsider, (tx) =>
        tx.$executeRaw`SELECT register_secret(${groupId}::uuid, 'body', 'summary', 'category', ${validRarity}, ${validAskingPrice})`,
      ),
    "register_secret: 非メンバーは登録できない",
  );
  await assertRejects(
    () =>
      withRlsContext(seller, (tx) =>
        tx.$executeRaw`SELECT register_secret(${groupId}::uuid, 'body', 'summary', 'category', ${outOfRangeRarity}, ${validAskingPrice})`,
      ),
    "register_secret: rarityが範囲外（6）だと拒否される",
  );
  await assertRejects(
    () =>
      withRlsContext(seller, (tx) =>
        tx.$executeRaw`SELECT register_secret(${groupId}::uuid, 'body', 'summary', 'category', ${validRarity}, ${negativeAskingPrice})`,
      ),
    "register_secret: asking_priceが負だと拒否される",
  );

  const [toDelete] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string; secret_id: string }[]>`
      SELECT * FROM register_secret(${groupId}::uuid, 'delete me', 'summary', 'category', ${2}, ${50})
    `,
  );

  // --- delete_secret_before_listing ---
  await assertRejects(
    () =>
      withRlsContext(dealer, (tx) =>
        tx.$executeRaw`SELECT delete_secret_before_listing(${toDelete.secret_id}::uuid)`,
      ),
    "delete_secret_before_listing: 他人の秘密は削除できない",
  );
  await withRlsContext(seller, (tx) =>
    tx.$executeRaw`SELECT delete_secret_before_listing(${toDelete.secret_id}::uuid)`,
  );
  const deletedSecret = await prisma.secret.findUniqueOrThrow({ where: { id: toDelete.secret_id } });
  assert(deletedSecret.deletedAt !== null, "delete_secret_before_listing: deleted_atが設定される");

  // --- register_secret（出品〜落札まで進める本命） / update_secret_before_listing ---
  const [item] = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ id: string; secret_id: string }[]>`
      SELECT * FROM register_secret(${groupId}::uuid, 'original body', 'original summary', 'category', ${validRarity}, ${validAskingPrice})
    `,
  );

  const updated = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ body: string }[]>`
      SELECT * FROM update_secret_before_listing(${item.secret_id}::uuid, 'updated body', NULL, NULL, ${null}, ${null})
    `,
  );
  assert(updated[0]?.body === "updated body", "update_secret_before_listing: registered状態なら編集できる");

  // --- list_secret_for_auction（dealerがdealerロールを引くまでリトライ。プールはdealer/bidderの2人） ---
  let auctionId = "";
  let assignedDealer = "";
  for (let i = 0; i < 20; i++) {
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
    if (assignedDealer === dealer) break;
  }
  assert(assignedDealer === dealer, "list_secret_for_auction: dealerがランダム選抜される");

  const listedItem = await prisma.secretGroupItem.findUniqueOrThrow({ where: { id: item.id } });
  assert(listedItem.status === "listed", "list_secret_for_auction: statusがlistedになる");

  // 2026-08-23レビュー反映: 前払い（P4）のcreditはlist_secret_for_auctionでは
  // なくapprove_dealer_assignmentで行う（承認前に辞退が続き最終的に誰も
  // 承認できないケースで、出品者に前払いだけ残ってしまうのを防ぐため。
  // ユーザー報告で発覚。scripts/verify-auctions.mtsにも同種の検証あり）。
  const sellerWalletBeforeApproval = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: seller } },
  });
  assert(
    sellerWalletBeforeApproval.balance === 0,
    "list_secret_for_auction: 前払いはまだcreditされない（承認待ちの間は出品者残高が動かない）",
  );

  // listed後はregistered状態向けRPCが使えなくなる
  await assertRejects(
    () =>
      withRlsContext(seller, (tx) =>
        tx.$executeRaw`SELECT update_secret_before_listing(${item.secret_id}::uuid, 'too late', NULL, NULL, NULL, NULL)`,
      ),
    "update_secret_before_listing: listed後は編集できない",
  );
  await assertRejects(
    () =>
      withRlsContext(seller, (tx) =>
        tx.$executeRaw`SELECT delete_secret_before_listing(${item.secret_id}::uuid)`,
      ),
    "delete_secret_before_listing: listed後は削除できない",
  );

  // --- ディーラー承認・入札・確定（my_secret_collection_viewの「落札者」分岐検証のため） ---
  await withRlsContext(dealer, (tx) => tx.$executeRaw`SELECT approve_dealer_assignment(${auctionId}::uuid)`);

  const sellerWalletAfterApproval = await prisma.wallet.findUniqueOrThrow({
    where: { groupId_userId: { groupId, userId: seller } },
  });
  assert(
    sellerWalletAfterApproval.balance === 100,
    `approve_dealer_assignment: 承認時点で前払い(asking_price分)がsellerに入る（実際:${sellerWalletAfterApproval.balance}）`,
  );

  await withRlsContext(bidder, (tx) => tx.$executeRaw`SELECT place_bid(${auctionId}::uuid, 120)`);

  await prisma.auction.update({
    where: { id: auctionId },
    data: { startsAt: new Date(Date.now() - 2000), endsAt: new Date(Date.now() - 1000) },
  });
  await withServiceRole((tx) => tx.$executeRaw`SELECT claim_auction_for_finalize(${auctionId}::uuid)`);
  await withServiceRole((tx) => tx.$executeRaw`SELECT finalize_auction(${auctionId}::uuid)`);

  const finalAuction = await prisma.auction.findUniqueOrThrow({ where: { id: auctionId } });
  assert(finalAuction.status === "sold" && finalAuction.winnerId === bidder, "確定処理でsold・bidderが落札者になる");

  // --- my_secret_collection_view ---
  const sellerCollection = await withRlsContext(seller, (tx) =>
    tx.$queryRaw<{ secret_id: string }[]>`SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid`,
  );
  assert(
    sellerCollection.some((r) => r.secret_id === item.secret_id),
    "my_secret_collection_view: 出品者は自分の秘密が見える（owner分岐）",
  );

  const bidderCollection = await withRlsContext(bidder, (tx) =>
    tx.$queryRaw<{ secret_id: string }[]>`SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid`,
  );
  assert(
    bidderCollection.some((r) => r.secret_id === item.secret_id),
    "my_secret_collection_view: 落札者は落札した秘密が見える（winner分岐）",
  );

  // --- getCollectionItem相当（features/secrets/server/get-collection-item.ts） ---
  // my_secret_collection_viewには無い落札価格・出品者名を、auctions/usersから
  // 追加で合成する（秘密ビューワー⑫用）。
  const collectionItem = await withRlsContext(bidder, async (tx) => {
    const rows = await tx.$queryRaw<{ auction_id: string; seller_id: string }[]>`
      SELECT * FROM my_secret_collection_view
      WHERE group_id = ${groupId}::uuid AND secret_id = ${item.secret_id}::uuid
    `;
    const row = rows[0];
    const [auction, sellerUser] = await Promise.all([
      tx.auction.findUnique({ where: { id: row.auction_id }, select: { finalPrice: true } }),
      tx.user.findUnique({ where: { id: row.seller_id }, select: { nickname: true } }),
    ]);
    return { finalPrice: auction?.finalPrice, sellerNickname: sellerUser?.nickname };
  });
  assert(
    collectionItem.finalPrice === finalAuction.finalPrice,
    "getCollectionItem相当: 落札価格(auctions.final_price)が取得できる",
  );
  assert(
    typeof collectionItem.sellerNickname === "string" && collectionItem.sellerNickname.length > 0,
    "getCollectionItem相当: 出品者のnicknameが取得できる",
  );

  const dealerCollection = await withRlsContext(dealer, (tx) =>
    tx.$queryRaw<{ secret_id: string }[]>`SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid`,
  );
  assert(
    !dealerCollection.some((r) => r.secret_id === item.secret_id),
    "my_secret_collection_view: ディーラーは出品者でも落札者でもないので見えない",
  );

  // --- listMySecrets相当（features/secrets/server/list-my-secrets.ts） ---
  const myItems = await withRlsContext(seller, (tx) =>
    tx.secretGroupItem.findMany({
      where: { groupId, secret: { ownerId: seller } },
      include: { secret: true },
    }),
  );
  assert(
    myItems.some((row) => row.id === item.id && row.secret.summary === "original summary"),
    "listMySecrets相当: 自分のsecret_group_itemsがsecrets結合込みで取れる",
  );
  const dealerItems = await withRlsContext(dealer, (tx) =>
    tx.secretGroupItem.findMany({ where: { groupId, secret: { ownerId: dealer } } }),
  );
  assert(dealerItems.length === 0, "listMySecrets相当: 自分が出品していなければ0件");

  // --- getMySecretItem相当（features/secrets/server/get-my-secret-item.ts） ---
  const ownItem = await withRlsContext(seller, (tx) =>
    tx.secretGroupItem.findFirst({
      where: { id: item.id, secret: { ownerId: seller } },
      include: { secret: true },
    }),
  );
  assert(ownItem?.id === item.id, "getMySecretItem相当: 本人は自分のitemを1件取得できる");
  const notOwnItem = await withRlsContext(dealer, (tx) =>
    tx.secretGroupItem.findFirst({
      where: { id: item.id, secret: { ownerId: dealer } },
      include: { secret: true },
    }),
  );
  assert(notOwnItem === null, "getMySecretItem相当: 他人のitemはnullになる（owner詐称防止）");

  // --- listMyWinnings相当（features/secrets/server/list-my-winnings.ts） ---
  const winningsForBidder = await withRlsContext(bidder, async (tx) => {
    const rows = await tx.$queryRaw<{ auction_id: string; secret_id: string; seller_id: string }[]>`
      SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid
    `;
    const winnings = rows.filter((r) => r.seller_id !== bidder);
    const auctions = await tx.auction.findMany({
      where: { id: { in: winnings.map((r) => r.auction_id) } },
      select: { id: true, finalPrice: true },
    });
    const priceById = new Map(auctions.map((a) => [a.id, a.finalPrice]));
    return winnings.map((r) => ({ ...r, final_price: priceById.get(r.auction_id) ?? null }));
  });
  assert(
    winningsForBidder.some((r) => r.secret_id === item.secret_id && r.final_price === finalAuction.finalPrice),
    "listMyWinnings相当: 落札者にはfinal_priceを補ったwinner行が返る",
  );
  const winningsForSeller = await withRlsContext(seller, async (tx) => {
    const rows = await tx.$queryRaw<{ seller_id: string }[]>`
      SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid
    `;
    return rows.filter((r) => r.seller_id !== seller);
  });
  assert(
    winningsForSeller.length === 0,
    "listMyWinnings相当: 自分が出品した行（seller_id=自分）はwinner行から除外される",
  );

  // --- users_select_auction_counterparty（prisma/sql/secrets/005_collection_history_policy.sql） ---
  // 出品者がグループを脱退した後も、落札者からその出品者のnicknameが引き続き
  // 取得できることを確認する（2026-08-22レビュー指摘。以前はusers_select_
  // self_or_group_memberのみで、脱退後は「不明」になっていた）。
  // 最後のadminは脱退できないため、先にdealerをadmin化してから脱退させる。
  await withRlsContext(seller, (tx) =>
    tx.$executeRaw`SELECT update_group_member_role(${groupId}::uuid, ${dealer}::uuid, 'admin'::member_role)`,
  );
  await withRlsContext(seller, (tx) => tx.$executeRaw`SELECT leave_group(${groupId}::uuid)`);

  const sellerNicknameAfterLeaving = await withRlsContext(bidder, (tx) =>
    tx.user.findUnique({ where: { id: seller }, select: { nickname: true } }),
  );
  assert(
    sellerNicknameAfterLeaving?.nickname === "SecretsTest0",
    "users_select_auction_counterparty: 出品者が脱退後も落札者からnicknameが見える",
  );

  const sellerNicknameForOutsider = await withRlsContext(outsider, (tx) =>
    tx.user.findUnique({ where: { id: seller }, select: { nickname: true } }),
  );
  assert(
    sellerNicknameForOutsider === null,
    "users_select_auction_counterparty: 取引に無関係な第三者には引き続き見えない",
  );

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

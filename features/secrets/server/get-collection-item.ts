import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { MySecretCollectionRow } from "@/features/secrets/types";

/**
 * 秘密ビューワー（⑫、落札後）用。my_secret_collection_viewから対象の1件を
 * 絞り込み、落札価格（auctions.final_price）と出品者のnicknameを合わせて返す
 * （viewにはこの2つが含まれないため）。
 */
export async function getCollectionItem(userId: string, groupId: string, secretId: string) {
  return withRlsContext(userId, async (tx) => {
    const rows = await tx.$queryRaw<MySecretCollectionRow[]>`
      SELECT * FROM my_secret_collection_view
      WHERE group_id = ${groupId}::uuid AND secret_id = ${secretId}::uuid
    `;
    const row = rows[0];
    if (!row) return null;

    const [auction, seller] = await Promise.all([
      tx.auction.findUnique({ where: { id: row.auction_id }, select: { finalPrice: true } }),
      tx.user.findUnique({ where: { id: row.seller_id }, select: { nickname: true } }),
    ]);

    return {
      ...row,
      final_price: auction?.finalPrice ?? null,
      seller_nickname: seller?.nickname ?? null,
    };
  });
}

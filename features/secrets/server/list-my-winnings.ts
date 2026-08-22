import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { MySecretCollectionRow } from "@/features/secrets/types";

/**
 * 秘密リスト（⑬）「落札済み」タブ用。my_secret_collection_viewは
 * 出品者側の行（自分が売った秘密）も含む（get-my-secret-collection.tsの
 * コメント参照）ため、ここではwinner側（seller_id !== 自分）のみに絞り、
 * viewには無いfinal_priceをauctionsから補って返す。
 */
export async function listMyWinnings(userId: string, groupId: string) {
  return withRlsContext(userId, async (tx) => {
    const rows = await tx.$queryRaw<MySecretCollectionRow[]>`
      SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid
    `;
    const winnings = rows.filter((row) => row.seller_id !== userId);
    if (winnings.length === 0) return [];

    const auctions = await tx.auction.findMany({
      where: { id: { in: winnings.map((row) => row.auction_id) } },
      select: { id: true, finalPrice: true },
    });
    const priceById = new Map(auctions.map((auction) => [auction.id, auction.finalPrice]));

    return winnings.map((row) => ({
      ...row,
      final_price: priceById.get(row.auction_id) ?? null,
    }));
  });
}

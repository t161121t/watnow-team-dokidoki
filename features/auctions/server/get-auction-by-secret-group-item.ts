import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionPublicViewRow } from "@/features/auctions/types";

/**
 * 関連秘密詳細（⑯）用。secret_group_item_idからauction_public_viewを1件引く。
 * ディーラー視点でsummary/category/rarityを見るための経路
 * （secretsテーブル直参照はRLSでbody等ごとブロックされるため使わない。
 * features/auctions/server/get-my-dealer-auctions.tsと同じ理由）。
 */
export async function getAuctionBySecretGroupItem(
  userId: string,
  secretGroupItemId: string,
): Promise<AuctionPublicViewRow | null> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionPublicViewRow[]>`
      SELECT * FROM auction_public_view
      WHERE secret_group_item_id = ${secretGroupItemId}::uuid
      ORDER BY starts_at DESC NULLS LAST
      LIMIT 1
    `,
  );
  return rows[0] ?? null;
}

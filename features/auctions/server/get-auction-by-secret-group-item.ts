import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionPublicViewRow } from "@/features/auctions/types";

/**
 * 関連秘密詳細（⑯）用。secret_group_item_idからauction_public_viewを1件引く。
 * ディーラー視点でsummary/category/rarityを見るための経路
 * （secretsテーブル直参照はRLSでbody等ごとブロックされるため使わない。
 * features/auctions/server/get-my-dealer-auctions.tsと同じ理由）。
 *
 * 不落札で秘密が返却され再出品されると、同じsecret_group_item_idに対して
 * 複数のauctionsが存在しうる。新しいauctionはpending_dealer_approval状態で
 * starts_atがまだnullのため、starts_at DESCで並べると常に古い（完了済み）
 * auctionが選ばれてしまう（2026-08-22レビュー指摘）。auction_public_viewは
 * created_atを持たないため、auctionsに戻ってcreated_at DESCで並べる。
 */
export async function getAuctionBySecretGroupItem(
  userId: string,
  secretGroupItemId: string,
): Promise<AuctionPublicViewRow | null> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionPublicViewRow[]>`
      SELECT apv.* FROM auction_public_view apv
      JOIN auctions a ON a.id = apv.auction_id
      WHERE apv.secret_group_item_id = ${secretGroupItemId}::uuid
      ORDER BY a.created_at DESC
      LIMIT 1
    `,
  );
  return rows[0] ?? null;
}

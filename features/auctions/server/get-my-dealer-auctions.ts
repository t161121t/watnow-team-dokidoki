import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionPublicViewRow } from "@/features/auctions/types";

/**
 * 秘密リスト（⑬）「ディーラー」タブ用。自分がdealer_idの案件を
 * auction_public_view経由で返す。category/rarity/summaryはこのview経由でのみ
 * 非owner/非winnerにも公開される（secretsテーブルへの直接参照はRLS
 * （secrets_select_owner_or_winner）でbody等ごとブロックされるため使わない。
 * features/auctions/server/get-auction-list.tsと同じview）。
 */
export async function getMyDealerAuctions(
  userId: string,
  groupId: string,
): Promise<AuctionPublicViewRow[]> {
  return withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionPublicViewRow[]>`
      SELECT * FROM auction_public_view
      WHERE group_id = ${groupId}::uuid AND dealer_id = ${userId}::uuid
      ORDER BY ends_at ASC NULLS LAST
    `,
  );
}

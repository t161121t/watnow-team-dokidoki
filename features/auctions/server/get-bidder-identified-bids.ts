import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { BidderIdentifiedViewRow } from "@/features/auctions/types";

/**
 * ⑯関連秘密詳細（出品者/ディーラー向け）用。bidder_identified_view経由。
 * viewのWHERE句が唯一のアクセス制御（呼び出しユーザーがseller/dealerでなければ
 * 0件になるだけで、ここでは追加チェックしない。prisma/sql/auctions/002_views.sql参照）。
 */
export async function getBidderIdentifiedBids(
  userId: string,
  auctionId: string,
): Promise<BidderIdentifiedViewRow[]> {
  return withRlsContext(userId, (tx) =>
    tx.$queryRaw<BidderIdentifiedViewRow[]>`
      SELECT * FROM bidder_identified_view WHERE auction_id = ${auctionId}::uuid
      ORDER BY amount DESC, created_at ASC
    `,
  );
}

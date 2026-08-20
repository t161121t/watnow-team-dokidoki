import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AnonymousBidFeedViewRow } from "@/features/auctions/types";

/**
 * ⑩オークション会場用（他入札者は識別不可）。anonymous_bid_feed_view経由。
 * bidder_idを含まないため、出品者/ディーラー以外の一般入札者向けの入札履歴表示に使う。
 */
export async function getAnonymousBidFeed(
  userId: string,
  auctionId: string,
): Promise<AnonymousBidFeedViewRow[]> {
  return withRlsContext(userId, (tx) =>
    tx.$queryRaw<AnonymousBidFeedViewRow[]>`
      SELECT * FROM anonymous_bid_feed_view WHERE auction_id = ${auctionId}::uuid
      ORDER BY amount DESC, created_at ASC
    `,
  );
}

import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * オークション一覧（⑨）で「あなたが最高入札者です」を表示するために使う。
 *
 * bidsのstatus='winning'は確定処理（finalize_auction）でのみ設定され、
 * open中の入札は全てstatus='valid'のまま（prisma/sql/auctions/004_place_bid.sql
 * 参照）。そのため開催中に「今の最高入札者か」を判定するには、自分の入札額が
 * そのauctionの現在価格と一致し、かつauction自体がまだopenであることを見る
 * 必要がある（RLS: bids_select_ownで自分の入札のみ、auctions_select_memberで
 * 参加groupのauctionのみ、それぞれ独立に効く）。
 */
export async function getMyWinningAuctionIds(userId: string, groupId: string): Promise<string[]> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.bid.findMany({
      where: { groupId, bidderId: userId, status: "valid" },
      select: {
        auctionId: true,
        amount: true,
        auction: { select: { status: true, currentPrice: true } },
      },
    }),
  );
  return rows
    .filter((row) => row.auction.status === "open" && row.amount === row.auction.currentPrice)
    .map((row) => row.auctionId);
}

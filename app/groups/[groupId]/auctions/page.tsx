import { AuctionListScreen } from "@/features/auctions/components/auction-list-screen";
import { formatRemainingLabel } from "@/features/auctions/format";
import { getAuctionList, getMyWinningAuctionIds } from "@/features/auctions/actions";
import type { Auction } from "@/lib/types/auction";

export default async function AuctionsPage({
  params,
}: PageProps<"/groups/[groupId]/auctions">) {
  const { groupId } = await params;
  const [rows, winningAuctionIds] = await Promise.all([
    getAuctionList({ groupId }),
    getMyWinningAuctionIds({ groupId }),
  ]);
  const winningSet = new Set(winningAuctionIds);

  const auctions: Auction[] = rows.map((row) => ({
    id: row.auction_id,
    groupId: row.group_id,
    secretId: row.secret_group_item_id,
    summary: row.summary,
    category: row.category,
    rarity: row.rarity as 1 | 2 | 3 | 4 | 5,
    currentPrice: row.current_price,
    minimumBid: row.current_price + 20,
    bidCount: Number(row.bid_count),
    remainingLabel: formatRemainingLabel(row.ends_at, row.status),
    isLeading: winningSet.has(row.auction_id),
    bids: [],
  }));

  return <AuctionListScreen groupId={groupId} auctions={auctions} />;
}

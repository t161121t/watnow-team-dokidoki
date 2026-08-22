import { notFound } from "next/navigation";

import { getAnonymousBidFeed, getAuction } from "@/features/auctions/actions";
import { AuctionRoomScreen } from "@/features/auctions/components/auction-room-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";

export default async function AuctionRoomPage({
  params,
}: PageProps<"/groups/[groupId]/auctions/[auctionId]">) {
  const { groupId, auctionId } = await params;

  const [auction, bidFeed] = await Promise.all([
    getAuction({ auctionId }),
    getAnonymousBidFeed({ auctionId }),
  ]);

  if (!auction) {
    notFound();
  }

  return (
    <AuctionRoomScreen
      auction={{
        id: auction.auction_id,
        groupId: auction.group_id,
        summary: auction.summary,
        category: auction.category,
        rarity: auction.rarity,
        status: auction.status,
        currentPrice: auction.current_price,
        endsAt: auction.ends_at,
      }}
      initialBidFeed={bidFeed.map((row) => ({ amount: row.amount, rank: Number(row.rank) }))}
      balanceSection={<WalletBalance groupId={groupId} className="inline font-bold text-white/70" />}
    />
  );
}

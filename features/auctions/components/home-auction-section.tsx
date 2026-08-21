import Link from "next/link";

import { AuctionCard } from "@/features/auctions/components/auction-card";
import type { Auction } from "@/lib/types/auction";

export function HomeAuctionSection({
  groupId,
  auctions,
}: {
  groupId: string;
  auctions: Auction[];
}) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">開催中のオークション</h2>
        <Link
          href={`/groups/${groupId}/auctions`}
          className="text-xs font-bold text-[#e591ff]"
        >
          すべて見る
        </Link>
      </div>
      <div className="space-y-3">
        {auctions.slice(0, 2).map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
    </section>
  );
}

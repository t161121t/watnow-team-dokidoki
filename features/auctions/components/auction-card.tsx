import Link from "next/link";

import { NeonCard } from "@/components/ui/neon-card";
import type { Auction } from "@/lib/types/auction";

export function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <Link
      href={`/groups/${auction.groupId}/auctions/${auction.id}`}
      className="group block focus-visible:outline-none"
    >
      <NeonCard className="p-5 transition group-hover:-translate-y-0.5 group-hover:border-[#d75cff] group-focus-visible:ring-2 group-focus-visible:ring-[#c038ff]">
        <div className="mb-3 text-right">
          <span className="text-[11px] font-bold text-[#e591ff]">
            {auction.remainingLabel}
          </span>
        </div>
        <h3 className="line-clamp-2 text-sm leading-6 font-bold">{auction.title}</h3>
        <div className="mt-4 flex items-end justify-between border-t border-white/10 pt-3">
          <div>
            <p className="text-[10px] text-white/45">現在価格</p>
            <p className="mt-0.5 text-xl font-black">
              {auction.currentPrice.toLocaleString()}
              <span className="ml-1 text-[11px] text-white/55">pt</span>
            </p>
          </div>
          <span className="text-[10px] text-white/42">入札 {auction.bidCount}件</span>
        </div>
        {auction.isLeading ? (
          <p className="mt-2 text-right text-[10px] font-bold text-[#e591ff]">
            あなたが最高入札者です
          </p>
        ) : null}
      </NeonCard>
    </Link>
  );
}

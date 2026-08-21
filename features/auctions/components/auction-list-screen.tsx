import { AuctionCard } from "@/features/auctions/components/auction-card";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { getGroupNavigation } from "@/lib/navigation";
import type { Auction } from "@/lib/types/auction";
import type { Group } from "@/lib/types/group";

export function AuctionListScreen({
  group,
  auctions,
}: {
  group: Group;
  auctions: Auction[];
}) {
  return (
    <MobileShell withNavigation>
      <ScreenHeader title="オークション" />
      <div className="space-y-4">
        {auctions.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
      <BottomNavigation items={getGroupNavigation(group.id)} active="auctions" />
    </MobileShell>
  );
}

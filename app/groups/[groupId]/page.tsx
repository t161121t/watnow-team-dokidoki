import { HomeAuctionSection } from "@/features/auctions/components/home-auction-section";
import { GroupHomeScreen } from "@/features/groups/components/group-home-screen";
import { DealerAssignmentCard } from "@/features/secrets/components/dealer-assignment-card";
import { getAuctionsForGroup } from "@/lib/mocks/auctions";
import { getGroup } from "@/lib/mocks/groups";

export default async function GroupHomePage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  const group = getGroup(groupId);
  const auctions = getAuctionsForGroup(groupId);

  return (
    <GroupHomeScreen
      group={group}
      dealerSection={<DealerAssignmentCard groupId={groupId} />}
      auctionSection={<HomeAuctionSection groupId={groupId} auctions={auctions} />}
    />
  );
}

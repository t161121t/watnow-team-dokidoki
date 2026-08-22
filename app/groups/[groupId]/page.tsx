import { HomeAuctionSection } from "@/features/auctions/components/home-auction-section";
import { GroupHomeScreen } from "@/features/groups/components/group-home-screen";
import { DealerAssignmentCard } from "@/features/secrets/components/dealer-assignment-card";

export default async function GroupHomePage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  return (
    <GroupHomeScreen
      groupId={groupId}
      dealerSection={<DealerAssignmentCard groupId={groupId} />}
      auctionSection={<HomeAuctionSection groupId={groupId} />}
    />
  );
}

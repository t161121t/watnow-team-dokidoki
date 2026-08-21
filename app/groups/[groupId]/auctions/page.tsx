import { AuctionListScreen } from "@/features/auctions/components/auction-list-screen";
import { getAuctionsForGroup } from "@/lib/mocks/auctions";
import { getGroup } from "@/lib/mocks/groups";

export default async function AuctionsPage({
  params,
}: PageProps<"/groups/[groupId]/auctions">) {
  const { groupId } = await params;

  return (
    <AuctionListScreen
      group={getGroup(groupId)}
      auctions={getAuctionsForGroup(groupId)}
    />
  );
}

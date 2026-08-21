import { AuctionRoomScreen } from "@/features/auctions/components/auction-room-screen";
import { getAuction } from "@/lib/mocks/auctions";
import { getGroup } from "@/lib/mocks/groups";

export default async function AuctionRoomPage({
  params,
}: PageProps<"/groups/[groupId]/auctions/[auctionId]">) {
  const { groupId, auctionId } = await params;
  const source = getAuction(auctionId);

  return (
    <AuctionRoomScreen
      group={getGroup(groupId)}
      auction={{ ...source, groupId }}
    />
  );
}

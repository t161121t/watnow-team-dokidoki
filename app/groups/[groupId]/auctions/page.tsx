import { AuctionListScreen } from "@/features/auctions/components/auction-list-screen";

export default async function AuctionsPage({
  params,
}: PageProps<"/groups/[groupId]/auctions">) {
  const { groupId } = await params;

  return <AuctionListScreen groupId={groupId} />;
}

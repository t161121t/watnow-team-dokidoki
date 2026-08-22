import { getMyDealerAuctions } from "@/features/auctions/actions";
import { HomeAuctionSection } from "@/features/auctions/components/home-auction-section";
import { GroupHomeScreen } from "@/features/groups/components/group-home-screen";
import { DealerAssignmentCard } from "@/features/secrets/components/dealer-assignment-card";

export default async function GroupHomePage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  // ディーラー案内バナーのデータ（auctionsドメイン）はfeatures/secrets/
  // components/dealer-assignment-card.tsxから直接読めない（ドメイン境界。
  // 同ファイルのコメント参照）ため、ここでcross-domainのactions.ts経由で
  // 取得して渡す（app/groups/[groupId]/secrets/page.tsxと同じパターン）。
  const dealerAuctions = await getMyDealerAuctions({ groupId });
  const pending = dealerAuctions.find(
    (auction) => auction.status === "pending_dealer_approval",
  );

  return (
    <GroupHomeScreen
      groupId={groupId}
      dealerSection={
        <DealerAssignmentCard
          groupId={groupId}
          pendingSecretGroupItemId={pending?.secret_group_item_id ?? null}
        />
      }
      auctionSection={<HomeAuctionSection groupId={groupId} />}
    />
  );
}

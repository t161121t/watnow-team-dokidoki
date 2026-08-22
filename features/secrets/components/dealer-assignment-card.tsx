import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { getMyDealerAuctions } from "@/features/auctions/actions";

/**
 * グループホーム（⑥）の「ディーラー担当の秘密があります」バナー。
 * auctionsドメインのデータ（dealer_id=自分の案件）はここから直接読めない
 * ため、features/auctions/actions.ts経由で取得する（cross-domainのread
 * 唯一の許容経路。features/secrets/components/secret-list-screen.tsxの
 * dealerタブと同じ理由）。承認待ち（要対応）の案件がある時だけ表示する。
 */
export async function DealerAssignmentCard({ groupId }: { groupId: string }) {
  const auctions = await getMyDealerAuctions({ groupId });
  const pending = auctions.find((auction) => auction.status === "pending_dealer_approval");

  if (!pending) {
    return null;
  }

  return (
    <NeonCard className="mt-4 p-4">
      <p className="text-sm font-bold">ディーラー担当の秘密があります</p>
      <NeonLink
        href={{
          pathname: `/groups/${groupId}/secrets/${pending.secret_group_item_id}`,
          query: { tab: "dealer" },
        }}
        variant="secondary"
        size="sm"
        className="mt-3 w-full"
      >
        確認する
      </NeonLink>
    </NeonCard>
  );
}

import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getMyDealerAuctions } from "@/features/auctions/actions";
import { HomeAuctionSection } from "@/features/auctions/components/home-auction-section";
import { getAuthenticatedUserId } from "@/features/auth/actions";
import { GroupHomeScreen } from "@/features/groups/components/group-home-screen";
import { DealerAssignmentCard } from "@/features/secrets/components/dealer-assignment-card";

export default async function GroupHomePage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  // app/層はlib/supabase/serverを直接importできない（ESLint boundaries）
  // ため、features/auth/actions.tsのgetAuthenticatedUserIdでログイン確認
  // してから、cross-domainのgetMyDealerAuctions（auctionsドメイン）を呼ぶ
  // （2026-08-23レビュー指摘: エラーメッセージ文字列比較での認証判定は
  // 脆いため、安定した戻り値のgateに置き換えた）。
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}`)}`);
  }

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

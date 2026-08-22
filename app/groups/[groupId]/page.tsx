import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getMyDealerAuctions } from "@/features/auctions/actions";
import { HomeAuctionSection } from "@/features/auctions/components/home-auction-section";
import { GroupHomeScreen } from "@/features/groups/components/group-home-screen";
import { DealerAssignmentCard } from "@/features/secrets/components/dealer-assignment-card";

export default async function GroupHomePage({
  params,
}: PageProps<"/groups/[groupId]">) {
  const { groupId } = await params;

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  // ディーラー案内バナーのデータ（auctionsドメイン）はfeatures/secrets/
  // components/dealer-assignment-card.tsxから直接読めない（ドメイン境界。
  // 同ファイルのコメント参照）ため、ここでcross-domainのactions.ts経由で
  // 取得して渡す（app/groups/[groupId]/secrets/page.tsxと同じパターン）。
  // getMyDealerAuctionsは未ログインだと例外を投げる。app/層はlib/supabase/
  // serverを直接importできない（ESLint boundaries）ため、getCurrentUserId
  // で先に判定するのではなく、この呼び出し自体をtry/catchしてリダイレクトに
  // 変換する（この時点ではまだクライアント境界を越えていないので、production
  // でのServer Actionsエラーメッセージのサニタイズは効かず、message比較で
  // 安全に判定できる。2026-08-23レビュー指摘: 未ログイン時に500になっていた）。
  let dealerAuctions: Awaited<ReturnType<typeof getMyDealerAuctions>>;
  try {
    dealerAuctions = await getMyDealerAuctions({ groupId });
  } catch (error) {
    if (error instanceof Error && error.message === "ログインが必要です") {
      redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}`)}`);
    }
    throw error;
  }

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

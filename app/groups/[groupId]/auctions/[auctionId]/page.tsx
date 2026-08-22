import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getAnonymousBidFeed, getAuction } from "@/features/auctions/actions";
import { AuctionRoomScreen } from "@/features/auctions/components/auction-room-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";

export default async function AuctionRoomPage({
  params,
}: PageProps<"/groups/[groupId]/auctions/[auctionId]">) {
  const { groupId, auctionId } = await params;

  if (
    !z.string().uuid().safeParse(groupId).success ||
    !z.string().uuid().safeParse(auctionId).success
  ) {
    notFound();
  }

  // getAuction/getAnonymousBidFeedは未ログインだと例外を投げる。app/層は
  // lib/supabase/serverを直接importできない（ESLint boundaries）ため、
  // この呼び出し自体をtry/catchしてリダイレクトに変換する
  // （app/groups/[groupId]/page.tsxと同じ理由。2026-08-23レビュー指摘:
  // 未ログイン時に500になっていた）。
  let auction: Awaited<ReturnType<typeof getAuction>>;
  let bidFeed: Awaited<ReturnType<typeof getAnonymousBidFeed>>;
  try {
    [auction, bidFeed] = await Promise.all([
      getAuction({ auctionId }),
      getAnonymousBidFeed({ auctionId }),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "ログインが必要です") {
      redirect(
        `/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/auctions/${auctionId}`)}`,
      );
    }
    throw error;
  }

  // ルートのgroupIdとauction本来のgroup_idが一致することを確認する。
  // 一致確認をせずに描画すると、別グループのauctionを閲覧できてしまい、
  // WalletBalanceにも誤ったグループの残高が表示されてしまう
  // （place_bid RPC自体はauction行から server 側で group_id を導出するため
  // 課金は安全だが、表示上の「グループ完全分離」原則の違反となる。
  // 2026-08-22レビュー指摘）。
  if (!auction || auction.group_id !== groupId) {
    notFound();
  }

  return (
    <AuctionRoomScreen
      auction={{
        id: auction.auction_id,
        groupId: auction.group_id,
        summary: auction.summary,
        category: auction.category,
        rarity: auction.rarity,
        status: auction.status,
        currentPrice: auction.current_price,
        endsAt: auction.ends_at,
      }}
      initialBidFeed={bidFeed.map((row) => ({ amount: row.amount, rank: Number(row.rank) }))}
      balanceSection={<WalletBalance groupId={groupId} className="inline font-bold text-white/70" />}
    />
  );
}

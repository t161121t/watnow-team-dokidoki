import { notFound } from "next/navigation";

import { getAnonymousBidFeed, getAuction } from "@/features/auctions/actions";
import { AuctionRoomScreen } from "@/features/auctions/components/auction-room-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";

export default async function AuctionRoomPage({
  params,
}: PageProps<"/groups/[groupId]/auctions/[auctionId]">) {
  const { groupId, auctionId } = await params;

  const [auction, bidFeed] = await Promise.all([
    getAuction({ auctionId }),
    getAnonymousBidFeed({ auctionId }),
  ]);

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

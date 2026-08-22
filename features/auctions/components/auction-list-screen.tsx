import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { AuctionCard } from "@/features/auctions/components/auction-card";
import { toAuction } from "@/features/auctions/format";
import { getAuctionList } from "@/features/auctions/server/get-auction-list";
import { getMyWinningAuctionIds } from "@/features/auctions/server/get-my-winning-auction-ids";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";
import type { Auction } from "@/lib/types/auction";

/**
 * オークション一覧（⑨）。auctionsドメイン内の読み取り
 * （getAuctionList/getMyWinningAuctionIds）は自分でserver/を直接呼ぶ
 * （docs/アーキテクチャ.md §1.1a、2026-08-22レビュー指摘）。
 */
export async function AuctionListScreen({ groupId }: { groupId: string }) {
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/auctions`)}`);
  }

  const [rows, winningAuctionIds] = await Promise.all([
    getAuctionList(userId, groupId),
    getMyWinningAuctionIds(userId, groupId),
  ]);
  const winningSet = new Set(winningAuctionIds);

  // getAuctionListはgroup内の全auction（承認待ち・完了済み・キャンセル済み
  // 含む）を返す。一覧は入札会場の入口のため、まだ入札できないもの
  // （承認待ち等）は出さない（features/auctions/components/
  // home-auction-section.tsxと同じ理由。2026-08-23レビュー指摘）。
  const auctions: Auction[] = rows
    .filter((row) => row.status === "open")
    .map((row) => toAuction(row, winningSet.has(row.auction_id)));

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="オークション" />
      {auctions.length > 0 ? (
        <div className="space-y-4">
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/45">開催中のオークションはありません</p>
      )}
      <BottomNavigation items={getGroupNavigation(groupId)} active="auctions" />
    </MobileShell>
  );
}

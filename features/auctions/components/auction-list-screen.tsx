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

  const auctions: Auction[] = rows.map((row) => toAuction(row, winningSet.has(row.auction_id)));

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="オークション" />
      <div className="space-y-4">
        {auctions.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
      <BottomNavigation items={getGroupNavigation(groupId)} active="auctions" />
    </MobileShell>
  );
}

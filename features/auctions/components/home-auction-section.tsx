import Link from "next/link";

import { AuctionCard } from "@/features/auctions/components/auction-card";
import { toAuction } from "@/features/auctions/format";
import { getAuctionList } from "@/features/auctions/server/get-auction-list";
import { getMyWinningAuctionIds } from "@/features/auctions/server/get-my-winning-auction-ids";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * グループホーム（⑥）の「開催中のオークション」セクション。auctionsドメイン
 * 内の読み取りは自分でserver/を直接呼ぶ（features/auctions/components/
 * auction-list-screen.tsxと同じ理由。docs/アーキテクチャ.md §1.1a）。
 * 未ログインなら何も表示しない（呼び出し元のGroupHomeScreen側で既に
 * ログイン確認・リダイレクトを行っている前提。features/wallet/components/
 * wallet-balance.tsxと同じ、自己完結の読み取り専用セクション）。
 */
export async function HomeAuctionSection({ groupId }: { groupId: string }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const [rows, winningAuctionIds] = await Promise.all([
    getAuctionList(userId, groupId),
    getMyWinningAuctionIds(userId, groupId),
  ]);
  const winningSet = new Set(winningAuctionIds);
  const auctions = rows.map((row) => toAuction(row, winningSet.has(row.auction_id)));

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">開催中のオークション</h2>
        <Link
          href={`/groups/${groupId}/auctions`}
          className="text-xs font-bold text-[#e591ff]"
        >
          すべて見る
        </Link>
      </div>
      {auctions.length > 0 ? (
        <div className="space-y-3">
          {auctions.slice(0, 2).map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/45">開催中のオークションはありません</p>
      )}
    </section>
  );
}

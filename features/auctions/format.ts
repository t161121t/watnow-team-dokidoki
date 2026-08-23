import type { AuctionPublicViewRow, AuctionStatus } from "@/features/auctions/types";
import type { Auction } from "@/lib/types/auction";

/**
 * オークション一覧（⑨）・オークション会場（⑩）共通の残り時間表示。
 * pending_dealer_approvalはstarts_at/ends_atがまだ確定していない
 * （P1確定：ディーラー承認まで固定待機時間なし。docs/DB.md §3参照）。
 */
export function formatRemainingLabel(endsAt: Date | null, status: AuctionStatus): string {
  if (status === "pending_dealer_approval") return "承認待ち";
  if (!endsAt) return "-";

  const diffMs = endsAt.getTime() - Date.now();
  if (diffMs <= 0) return "終了";

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `残り${hours}時間${minutes}分`;

  const seconds = totalSeconds % 60;
  return `残り${minutes}分${seconds}秒`;
}

/**
 * auction_public_view の行をUI表示用の Auction 型に正規化する。
 * オークション一覧（⑨）・ホームの開催中セクション共通（2026-08-22）。
 */
export function toAuction(row: AuctionPublicViewRow, isLeading: boolean): Auction {
  return {
    id: row.auction_id,
    groupId: row.group_id,
    secretId: row.secret_group_item_id,
    title: row.title,
    category: row.category,
    rarity: row.rarity as 1 | 2 | 3 | 4 | 5,
    currentPrice: row.current_price,
    minimumBid: row.current_price + 1,
    bidCount: Number(row.bid_count),
    remainingLabel: formatRemainingLabel(row.ends_at, row.status),
    isLeading,
    bids: [],
  };
}

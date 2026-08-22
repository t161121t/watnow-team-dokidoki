import type { AuctionStatus } from "@/features/auctions/types";

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

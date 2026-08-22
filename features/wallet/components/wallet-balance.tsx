import { getCurrentUserId } from "@/lib/supabase/server";
import { getWalletBalance } from "@/features/wallet/server/get-balance";

/**
 * Server Component の例。読み取り専用なのでactions.tsを経由せず
 * features/wallet/server を直接呼ぶ（2026-08-20方針変更。
 * docs/アーキテクチャ.md §1.1a参照）。userIdの取得はこのコンポーネント自身の
 * 責務（server/の関数は暗黙の認証を持たず、userIdを明示的な引数で受け取る）。
 */
export async function WalletBalance({
  groupId,
  className,
}: {
  groupId: string;
  className?: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return <p className={className}>ログインが必要です</p>;
  }

  const balance = await getWalletBalance(userId, groupId);

  if (balance === null) {
    return <p className={className}>まだ財布がありません</p>;
  }

  return <p className={className}>{balance.toLocaleString()}pt</p>;
}

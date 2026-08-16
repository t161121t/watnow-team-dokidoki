import { fetchWalletBalance } from "@/features/wallet/actions";

/**
 * Server Component の例。UI 層からは actions.ts だけを呼ぶ
 * （features/wallet/server を直接 import しない。ESLint boundaries が検出する）。
 */
export async function WalletBalance({ groupId }: { groupId: string }) {
  const balance = await fetchWalletBalance({ groupId });

  if (balance === null) {
    return <p>まだ財布がありません</p>;
  }

  return <p>{balance} pt</p>;
}

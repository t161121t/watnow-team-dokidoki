import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * このファイルはアーキテクチャのサンプル実装（実DBで検証済み。scripts/verify-rls.mts）。
 *
 * ここで示したい形だけ守ってほしい:
 *   1. userId を受け取る（呼び出し元の actions.ts が Auth から取得して渡す）
 *   2. withRlsContext でラップし、RLSを効かせた状態でクエリする
 *   3. features/wallet/server/ の外からはこのファイルを直接 import しない
 *      （必ず features/wallet/actions.ts 経由にする）
 */
export async function getWalletBalance(
  userId: string,
  groupId: string,
): Promise<number | null> {
  return withRlsContext(userId, async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { balance: true },
    });
    return wallet?.balance ?? null;
  });
}

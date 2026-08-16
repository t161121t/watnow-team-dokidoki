import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * このファイルはアーキテクチャのサンプル実装。
 * `wallets` テーブルはまだマイグレーションされていないため未検証。
 * schema.prisma にモデルが追加され次第、$queryRaw を tx.wallets.findUnique(...)
 * のような型付きクエリに置き換える。
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
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      SELECT balance FROM wallets
      WHERE group_id = ${groupId}::uuid AND user_id = ${userId}::uuid
    `;
    return rows[0]?.balance ?? null;
  });
}

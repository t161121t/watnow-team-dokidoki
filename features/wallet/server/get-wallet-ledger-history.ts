import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";

/**
 * features/wallet/server/get-balance.tsと同じパターン（RPC/Viewを経由しない
 * 素のPrismaクエリ）。wallet_ledgerは「本人のみselect可」（wallet/002_rls.sql）
 * のため、userIdでの絞り込みはRLSと二重になるが、他のドメインと同様に
 * アプリ側でも明示しておく。
 */
const groupIdSchema = z.string().uuid();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * ⑭マイページのポイント履歴表示向け。
 *
 * 2026-08-22 PRレビュー指摘: 無制限findManyだと履歴が蓄積するほど描画毎に
 * 全件返してしまうため、cursorベースのページネーションにした（createdAt降順
 * + idをcursorに使う。wallet_ledgerには(group_id, user_id, created_at desc)の
 * indexがある。prisma/schema.prisma参照）。
 */
export async function getWalletLedgerHistory(
  userId: string,
  groupId: string,
  options?: { limit?: number; cursor?: string },
) {
  const parsedGroupId = groupIdSchema.parse(groupId);
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);

  return withRlsContext(userId, (tx) =>
    tx.walletLedger.findMany({
      where: { groupId: parsedGroupId, userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(options?.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    }),
  );
}

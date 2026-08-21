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

/** ⑭マイページのポイント履歴表示向け。 */
export async function getWalletLedgerHistory(userId: string, groupId: string) {
  const parsedGroupId = groupIdSchema.parse(groupId);

  return withRlsContext(userId, (tx) =>
    tx.walletLedger.findMany({
      where: { groupId: parsedGroupId, userId },
      orderBy: { createdAt: "desc" },
    }),
  );
}

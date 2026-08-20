import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";

/**
 * このファイルはアーキテクチャのサンプル実装（実DBで検証済み。scripts/verify-rls.mts）。
 *
 * ここで示したい形だけ守ってほしい:
 *   1. userId を受け取る（呼び出し元がAuthから取得して渡す。書き込み系のactions.ts
 *      からでも、読み取り系のRSCから直接でもよい。docs/アーキテクチャ.md §1.1a）
 *   2. withRlsContext でラップし、RLSを効かせた状態でクエリする
 *   3. groupId のような、呼び出し元の外部入力（route params 等）に由来しうる値は
 *      ここでもバリデーションする。actions.ts経由の書き込みならZodのチェックを
 *      経由するが、RSCから直接呼ばれる読み取りにはそのチェックが挟まらないため
 *      （2026-08-20 PRレビュー指摘。actions.tsを介さない設計にした以上、
 *      信頼境界はこのファイル自身が担う）
 */
const groupIdSchema = z.string().uuid();

export async function getWalletBalance(
  userId: string,
  groupId: string,
): Promise<number | null> {
  const parsedGroupId = groupIdSchema.parse(groupId);

  return withRlsContext(userId, async (tx) => {
    const wallet = await tx.wallet.findUnique({
      where: { groupId_userId: { groupId: parsedGroupId, userId } },
      select: { balance: true },
    });
    return wallet?.balance ?? null;
  });
}

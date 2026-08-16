import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

/**
 * Prisma接続は特権ロールでDBに繋がるため、何もしなければ全テーブルのRLSを
 * 素通りする。呼び出しごとにトランザクション内で `authenticated` ロールへ
 * SET LOCAL し、`auth.uid()` が読む request.jwt.claims をセットすることで、
 * Supabaseが書いたRLSポリシーをPrisma経由でも強制する。
 *
 * SET LOCAL / set_config(..., true) はどちらもトランザクション終了時に
 * 自動的に戻るため、コネクションプールの使い回しで権限が漏れることはない。
 */
export async function withRlsContext<T>(
  userId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const claims = JSON.stringify({ sub: userId, role: "authenticated" });
    await tx.$executeRaw`SELECT set_config('request.jwt.claims', ${claims}, true)`;
    await tx.$executeRaw`SET LOCAL ROLE authenticated`;
    return fn(tx);
  });
}

/** 未ログインユーザー向け。anon ロールのRLSポリシーのみが適用される。 */
export async function withAnonContext<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL ROLE anon`;
    return fn(tx);
  });
}

/**
 * RLSを意図的にバイパスする特権コンテキスト。
 * 使ってよいのは、ユーザーの代理ではなくシステムとして動く処理のみ
 * （例: `finalize_due_auctions` を叩く cron ジョブ）。
 * 通常のリクエスト処理からは絶対に使わない（features/*\/server 内で
 * user_id が取れているなら必ず withRlsContext を使うこと）。
 */
export async function withServiceRole<T>(
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx));
}

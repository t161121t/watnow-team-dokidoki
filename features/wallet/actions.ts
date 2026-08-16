"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import { getWalletBalance } from "@/features/wallet/server/get-balance";

const inputSchema = z.object({
  groupId: z.string().uuid(),
});

/**
 * Server Action はここが唯一の入口。
 * - 認証（Supabase Auth）はここで確認する
 * - 入力バリデーション（zod）はここでする
 * - 実際のDBアクセスは server/ に委譲する（ここに $queryRaw / prisma.xxx を書かない）
 */
export async function fetchWalletBalance(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("ログインが必要です");
  }

  const { groupId } = inputSchema.parse(input);
  return getWalletBalance(userId, groupId);
}

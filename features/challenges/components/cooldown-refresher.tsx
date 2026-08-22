"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * チャレンジ詳細（⑧）でクールダウン中に表示する。ChallengeDetailScreenは
 * サーバーレンダー時点のcooldown判定を1回だけ返すため、ユーザーが画面を
 * 開いたまま待っているとクールダウンが明けても「挑戦する」ボタンが
 * 出てこない問題があった（2026-08-23レビュー指摘）。cooldownUntilの
 * タイミングでrouter.refresh()し、サーバー側の再判定に任せる。
 */
export function CooldownRefresher({ cooldownUntil }: { cooldownUntil: string | null }) {
  const router = useRouter();

  useEffect(() => {
    if (!cooldownUntil) return;

    const remainingMs = new Date(cooldownUntil).getTime() - Date.now();
    if (remainingMs <= 0) {
      router.refresh();
      return;
    }

    const timer = window.setTimeout(() => router.refresh(), remainingMs);
    return () => window.clearTimeout(timer);
  }, [cooldownUntil, router]);

  return null;
}

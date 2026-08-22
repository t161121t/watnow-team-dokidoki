import type { ChallengeCardState } from "@/features/challenges/components/challenge-card";

/**
 * 挑戦可能かの判定（⑧「クールダウン中なら再開までの表示」）。
 * 一覧・詳細で共通のロジック。lastAttemptは同じchallengeIdの中で
 * 一番新しいもの（呼び出し元でcreatedAt降順ソート済みの前提）。
 */
export function computeChallengeState(
  lastAttempt: { status: string; createdAt: Date } | undefined,
  cooldownSeconds: number | null,
): { state: ChallengeCardState; cooldownLabel: string | null; cooldownUntil: Date | null } {
  if (lastAttempt?.status === "pending") {
    return { state: "pending", cooldownLabel: null, cooldownUntil: null };
  }

  if (lastAttempt && cooldownSeconds !== null) {
    const cooldownUntil = new Date(lastAttempt.createdAt.getTime() + cooldownSeconds * 1000);
    if (cooldownUntil.getTime() > Date.now()) {
      return {
        state: "cooldown",
        cooldownLabel: `再挑戦まで${formatRemaining(cooldownUntil)}`,
        cooldownUntil,
      };
    }
  }

  return { state: "available", cooldownLabel: null, cooldownUntil: null };
}

function formatRemaining(until: Date): string {
  const diffMs = until.getTime() - Date.now();
  const totalMinutes = Math.max(1, Math.ceil(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}時間${minutes}分`;
  return `${minutes}分`;
}

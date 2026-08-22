import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { ChallengeCard } from "@/features/challenges/components/challenge-card";
import type { ChallengeListItem } from "@/features/challenges/components/challenge-card";
import { computeChallengeState } from "@/features/challenges/cooldown";
import { getGroupChallengeAttempts } from "@/features/challenges/server/get-group-challenge-attempts";
import { getGroupChallenges } from "@/features/challenges/server/get-group-challenges";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

const HISTORY_STATUS_LABELS: Record<string, string> = {
  pending: "承認待ち",
  awarded: "承認されました",
  rejected: "却下されました",
  canceled: "取消",
};

/**
 * チャレンジ一覧（⑧）。challengesドメイン内の読み取りは自分でserver/を
 * 直接呼ぶ（docs/アーキテクチャ.md §1.1a）。balanceSectionはwalletドメイン
 * （cross-domain）のため、呼び出し元のapp/groups/[groupId]/challenges/
 * page.tsxで組み立ててReactNodeとして渡す。
 */
export async function ChallengeScreen({
  groupId,
  balanceSection,
}: {
  groupId: string;
  balanceSection: ReactNode;
}) {
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/challenges`)}`);
  }

  const [challenges, myAttempts] = await Promise.all([
    getGroupChallenges(userId, groupId),
    getGroupChallengeAttempts(userId, groupId, { userId }),
  ]);

  const attemptsByChallenge = new Map<string, typeof myAttempts>();
  for (const attempt of myAttempts) {
    const list = attemptsByChallenge.get(attempt.challengeId) ?? [];
    list.push(attempt);
    attemptsByChallenge.set(attempt.challengeId, list);
  }

  const items: ChallengeListItem[] = challenges.map((challenge) => {
    const lastAttempt = attemptsByChallenge.get(challenge.id)?.[0];
    const { state, cooldownLabel } = computeChallengeState(
      lastAttempt,
      challenge.cooldownSeconds,
    );
    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      reward: challenge.rewardPoints,
      state,
      cooldownLabel,
    };
  });

  const recentHistory = myAttempts.slice(0, 5);

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="チャレンジ"
        action={
          <NeonLink href={`/groups/${groupId}/challenges/review`} variant="secondary" size="sm">
            承認待ち
          </NeonLink>
        }
      />
      <NeonCard className="mb-7 p-5">
        <p className="text-xs font-bold text-white/45">現在のポイント</p>
        {balanceSection}
      </NeonCard>

      <h2 className="mb-3 text-lg font-bold">本日のチャレンジ</h2>
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((challenge) => (
            <ChallengeCard key={challenge.id} groupId={groupId} challenge={challenge} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-white/45">チャレンジはまだありません</p>
      )}

      {recentHistory.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">自分の履歴</h2>
          <div className="space-y-2.5">
            {recentHistory.map((attempt) => (
              <NeonCard key={attempt.id} className="flex items-center justify-between gap-3 p-3.5">
                <p className="min-w-0 flex-1 truncate text-sm font-bold">
                  {challenges.find((c) => c.id === attempt.challengeId)?.title ?? "チャレンジ"}
                </p>
                <span className="shrink-0 text-[10px] text-white/45">
                  {HISTORY_STATUS_LABELS[attempt.status] ?? attempt.status}
                </span>
              </NeonCard>
            ))}
          </div>
        </section>
      ) : null}

      <BottomNavigation items={getGroupNavigation(groupId)} active="challenges" />
    </MobileShell>
  );
}

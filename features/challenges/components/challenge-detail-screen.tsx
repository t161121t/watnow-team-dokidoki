import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { computeChallengeState } from "@/features/challenges/cooldown";
import { getGroupChallengeAttempts } from "@/features/challenges/server/get-group-challenge-attempts";
import { getGroupChallenges } from "@/features/challenges/server/get-group-challenges";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * チャレンジ詳細（⑧）。challengesドメイン内の読み取りは自分でserver/を
 * 直接呼ぶ（docs/アーキテクチャ.md §1.1a）。「挑戦する」は写真の要否に
 * 関わらず/submitへ進む（写真不要なチャレンジはsubmit画面側で即確定できる）。
 */
export async function ChallengeDetailScreen({
  groupId,
  challengeId,
}: {
  groupId: string;
  challengeId: string;
}) {
  if (
    !z.string().uuid().safeParse(groupId).success ||
    !z.string().uuid().safeParse(challengeId).success
  ) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(
      `/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/challenges/${challengeId}`)}`,
    );
  }

  const [challenges, myAttempts] = await Promise.all([
    getGroupChallenges(userId, groupId),
    getGroupChallengeAttempts(userId, groupId, { userId }),
  ]);

  const challenge = challenges.find((c) => c.id === challengeId);
  if (!challenge) {
    notFound();
  }

  const lastAttempt = myAttempts.find((attempt) => attempt.challengeId === challengeId);
  const { state, cooldownLabel } = computeChallengeState(lastAttempt, challenge.cooldownSeconds);
  const canChallenge = state === "available";

  const listHref = `/groups/${groupId}/challenges`;
  const submitHref = `/groups/${groupId}/challenges/${challengeId}/submit`;

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="チャレンジ" backHref={listHref} />

      <NeonCard className="p-4">
        <h2 className="font-bold">{challenge.title}</h2>
        <p className="mt-2 text-xs font-black text-[#e692ff]">
          クリアで{challenge.rewardPoints}pt
        </p>
      </NeonCard>

      {challenge.description ? (
        <section className="mt-7">
          <h2 className="mb-3 text-lg font-bold underline decoration-white/70 underline-offset-4">
            チャレンジ内容
          </h2>
          <p className="text-sm leading-6 text-white/85">{challenge.description}</p>
        </section>
      ) : null}

      <div className="mt-8 space-y-3">
        {canChallenge ? (
          <NeonLink href={submitHref} variant="primary" size="lg" className="w-full">
            挑戦する
          </NeonLink>
        ) : (
          <p className="text-center text-sm font-bold text-white/55">
            {state === "pending" ? "承認待ちです" : cooldownLabel}
          </p>
        )}
        <NeonLink href={listHref} variant="primary" size="lg" className="w-full">
          戻る
        </NeonLink>
      </div>
      <BottomNavigation items={getGroupNavigation(groupId)} active="challenges" />
    </MobileShell>
  );
}

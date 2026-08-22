import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { ChallengeEvidenceScreen } from "@/features/challenges/components/challenge-evidence-screen";
import { computeChallengeState } from "@/features/challenges/cooldown";
import { getGroupChallengeAttempts } from "@/features/challenges/server/get-group-challenge-attempts";
import { getGroupChallenges } from "@/features/challenges/server/get-group-challenges";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * チャレンジ挑戦の証拠提出（⑧）読み込み層。challengesドメイン内の読み取りは
 * 自分でserver/を直接呼ぶ（docs/アーキテクチャ.md §1.1a）。承認待ち・
 * クールダウン中なら提出できないため詳細ページへ戻す（サーバー側の
 * submit_challenge RPCでも同じ条件は検証されるが、ここで先に弾いておく）。
 */
export async function ChallengeEvidenceLoader({
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
      `/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/challenges/${challengeId}/submit`)}`,
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
  const { state } = computeChallengeState(lastAttempt, challenge.cooldownSeconds);
  if (state !== "available") {
    redirect(`/groups/${groupId}/challenges/${challengeId}`);
  }

  return (
    <ChallengeEvidenceScreen
      groupId={groupId}
      challengeId={challengeId}
      title={challenge.title}
      reward={challenge.rewardPoints}
      requiresEvidencePhoto={challenge.requiresEvidencePhoto}
    />
  );
}

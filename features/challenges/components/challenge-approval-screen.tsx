import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonCard } from "@/components/ui/neon-card";
import { getChallengeEvidenceSignedUrl } from "@/features/challenges/actions";
import { ChallengeApprovalActions } from "@/features/challenges/components/challenge-approval-actions";
import { getPendingChallengeAttempts } from "@/features/challenges/server/get-pending-challenge-attempts";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * チャレンジ承認待ちキュー（⑧「他人の提出を承認/却下」）。challengesドメイン
 * 内の読み取りは自分でserver/を直接呼ぶ（docs/アーキテクチャ.md §1.1a）。
 * approve_challenge RPCがis_group_memberのみを要求するため、幹事に限らず
 * グループの誰でもここにアクセスできる。
 */
export async function ChallengeApprovalScreen({ groupId }: { groupId: string }) {
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(
      `/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/challenges/review`)}`,
    );
  }

  const attempts = await getPendingChallengeAttempts(userId, groupId);
  const rows = await Promise.all(
    attempts.map(async (attempt) => ({
      id: attempt.id,
      challengeTitle: attempt.challenge.title,
      reward: attempt.challenge.rewardPoints,
      submitterNickname: attempt.user.nickname,
      evidenceUrl: attempt.evidencePath
        ? await getChallengeEvidenceSignedUrl({ path: attempt.evidencePath })
        : null,
    })),
  );

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="承認待ち" backHref={`/groups/${groupId}/challenges`} />

      {rows.length > 0 ? (
        <div className="space-y-4">
          {rows.map((row) => (
            <NeonCard key={row.id} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 flex-1 truncate font-bold">{row.challengeTitle}</h3>
                <span className="shrink-0 text-xs font-black text-[#e692ff]">
                  {row.reward}pt
                </span>
              </div>
              <p className="mt-1 text-xs text-white/55">{row.submitterNickname}さんの提出</p>
              {row.evidenceUrl ? (
                // 署名付きURL（有効期限あり）の証拠写真。next/imageのremotePatterns
                // 設定が要らない一時URLのためimgタグで表示する
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.evidenceUrl}
                  alt="提出された証拠写真"
                  className="mt-3 max-h-56 w-full rounded-2xl object-cover"
                />
              ) : null}
              <ChallengeApprovalActions attemptId={row.id} />
            </NeonCard>
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#c038ff]/45 bg-black/50 px-6 py-12 text-center">
          <p className="font-bold">承認待ちの提出はありません</p>
        </div>
      )}
      <BottomNavigation items={getGroupNavigation(groupId)} active="challenges" />
    </MobileShell>
  );
}

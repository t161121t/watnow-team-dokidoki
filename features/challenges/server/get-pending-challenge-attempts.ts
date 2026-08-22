import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";

const groupIdSchema = z.string().uuid();

/**
 * 承認待ちキュー（⑧「他人の提出を承認/却下」）用。approve_challenge RPCが
 * is_group_memberのみを要求し承認者を管理者に限定していないため
 * （prisma/sql/challenges/002_submit_and_review.sql参照）、ここも同じ条件で
 * 「自分以外」の全pending attemptを返す（自己承認はRPC側でも拒否されるが、
 * UIにも自分の分は出さない）。
 */
export async function getPendingChallengeAttempts(userId: string, groupId: string) {
  const parsedGroupId = groupIdSchema.parse(groupId);

  return withRlsContext(userId, (tx) =>
    tx.challengeAttempt.findMany({
      where: { groupId: parsedGroupId, status: "pending", userId: { not: userId } },
      orderBy: { createdAt: "asc" },
      include: {
        challenge: { select: { title: true, rewardPoints: true } },
        user: { select: { nickname: true } },
      },
    }),
  );
}

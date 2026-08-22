import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { ApprovalDecision, ChallengeAttemptRow } from "@/features/challenges/types";

/**
 * チャレンジ承認/却下。自己承認不可・対象はpendingのみ、というガードは
 * approve_challenge RPC側が検証する。承認時のwallet creditも同一トランザクション。
 */
export async function approveChallenge(
  userId: string,
  attemptId: string,
  decision: ApprovalDecision,
): Promise<ChallengeAttemptRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<ChallengeAttemptRow[]>`
      SELECT * FROM approve_challenge(${attemptId}::uuid, ${decision}::approval_decision)
    `,
  );
  return rows[0];
}

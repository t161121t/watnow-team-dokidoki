import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { ChallengeAttemptRow } from "@/features/challenges/types";

/**
 * チャレンジ挑戦（⑧）。所属・cooldown・二重pending防止はsubmit_challenge RPC側が検証する。
 */
export async function submitChallenge(
  userId: string,
  groupId: string,
  challengeId: string,
  evidencePath: string | null,
): Promise<ChallengeAttemptRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<ChallengeAttemptRow[]>`
      SELECT * FROM submit_challenge(${groupId}::uuid, ${challengeId}::uuid, ${evidencePath}::text)
    `,
  );
  return rows[0];
}

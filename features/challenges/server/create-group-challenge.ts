import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { ChallengeRow } from "@/features/challenges/types";

/** グループ独自チャレンジの作成（幹事）。admin判定はcreate_group_challenge RPC側が行う。 */
export async function createGroupChallenge(
  userId: string,
  groupId: string,
  title: string,
  description: string | null,
  rewardPoints: number,
  requiresEvidencePhoto: boolean,
  cooldownSeconds: number | null,
): Promise<ChallengeRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<ChallengeRow[]>`
      SELECT * FROM create_group_challenge(
        ${groupId}::uuid,
        ${title}::text,
        ${description}::text,
        ${rewardPoints}::int,
        ${requiresEvidencePhoto}::boolean,
        ${cooldownSeconds}::int
      )
    `,
  );
  return rows[0];
}

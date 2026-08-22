import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";
import type { AttemptStatus } from "@/features/challenges/types";

const groupIdSchema = z.string().uuid();

/**
 * グループ内のチャレンジ挑戦履歴。get-group-challenges.tsと同じ理由でRPC/Viewを
 * 経由しない素のPrismaクエリ。承認待ちキュー（status: 'pending'）・自分の挑戦履歴
 * （userId指定）の両方をこの1関数でカバーする想定。戻り値の型はPrisma Clientの
 * 推論に任せる（generated prisma clientからの直接importが禁止されているため。
 * get-group-challenges.ts参照）。filterのstatusはfeatures/challenges/types.ts
 * 側のAttemptStatus（文字列リテラルユニオン）を使う。
 */
export async function getGroupChallengeAttempts(
  userId: string,
  groupId: string,
  filter?: { status?: AttemptStatus; userId?: string },
) {
  const parsedGroupId = groupIdSchema.parse(groupId);

  return withRlsContext(userId, (tx) =>
    tx.challengeAttempt.findMany({
      where: {
        groupId: parsedGroupId,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.userId ? { userId: filter.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
    }),
  );
}

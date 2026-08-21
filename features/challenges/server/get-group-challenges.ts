import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";

/**
 * features/wallet/server/get-balance.tsと同じパターン（RPC/Viewを経由しない
 * 素のPrismaクエリ。challengesにはget_dealer_decline_historyのような専用RPCが
 * 無いためこの形にした。docs/DB.md §6.4参照）。呼び出し元のRSCから直接呼べる
 * 読み取り想定のため、groupIdはここでもバリデーションする（2026-08-20
 * PRレビュー指摘と同じ理由。features/wallet/server/get-balance.ts参照）。
 *
 * 戻り値の型はPrisma Clientの推論に任せる（generated prisma clientからの直接
 * importはESLint no-restricted-imports で禁止されているため。features/*\/server
 * 以外からPrisma Clientの型に直接依存させない意図。eslint.config.mjs参照）。
 */
const groupIdSchema = z.string().uuid();

/**
 * ⑧チャレンジ一覧。system challenge（group_id null）+ 指定groupの独自challengeを
 * activeなもののみ返す。RLS（challenges_select_system_or_group）はユーザーが
 * 所属する全groupのchallengeを通してしまうため、"どのgroup視点か"はアプリ側で
 * groupIdを明示的に絞り込む必要がある。
 */
export async function getGroupChallenges(userId: string, groupId: string) {
  const parsedGroupId = groupIdSchema.parse(groupId);

  return withRlsContext(userId, (tx) =>
    tx.challenge.findMany({
      where: {
        status: "active",
        OR: [{ groupId: null }, { groupId: parsedGroupId }],
      },
      orderBy: { createdAt: "asc" },
    }),
  );
}

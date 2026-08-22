import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * 本人が所属するactiveなgroupの一覧。ログイン直後の遷移先判定
 * （features/auth/actions.ts）等に使う。RLS（groups_select_member）で
 * 既に本人の所属groupだけに絞られるが、他ドメインと同様アプリ側でも
 * 明示しておく。
 */
export async function getMyGroups(userId: string) {
  return withRlsContext(userId, (tx) =>
    tx.group.findMany({
      where: { members: { some: { userId, status: "active" } } },
      orderBy: { createdAt: "asc" },
    }),
  );
}

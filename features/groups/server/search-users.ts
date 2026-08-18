import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { UserSearchResultRow } from "@/features/groups/types";

// admin確認・最低2文字チェックはsearch_users RPC自体が行う（呼び出し元での
// 事前チェックは早期エラー表示の最適化にとどめ、DB側を信頼する）。
export async function searchUsers(
  userId: string,
  groupId: string,
  query: string,
): Promise<UserSearchResultRow[]> {
  return withRlsContext(userId, (tx) =>
    tx.$queryRaw<UserSearchResultRow[]>`
      SELECT * FROM search_users(${groupId}::uuid, ${query})
    `,
  );
}

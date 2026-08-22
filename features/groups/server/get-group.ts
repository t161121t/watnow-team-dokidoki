import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * グループ管理（⑤）・ホーム（⑥）等での単一グループ取得。RLS
 * （groups_select_member）でactive member以外にはnullが返る。
 */
export async function getGroup(userId: string, groupId: string) {
  return withRlsContext(userId, (tx) => tx.group.findUnique({ where: { id: groupId } }));
}

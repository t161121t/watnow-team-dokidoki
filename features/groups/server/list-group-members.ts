import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * グループ管理（⑤）でのメンバー一覧。RLS（group_members_select_member /
 * users_select_self_or_group_member）で、呼び出しユーザーが所属していない
 * グループのメンバーは返らない。
 */
export async function listGroupMembers(userId: string, groupId: string) {
  return withRlsContext(userId, (tx) =>
    tx.groupMember.findMany({
      where: { groupId, status: "active" },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, nickname: true, avatarPath: true } } },
    }),
  );
}

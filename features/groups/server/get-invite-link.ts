import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * グループ管理（⑤）で現在有効な招待URLのコードを表示するために使う
 * （RPC/Viewを経由しない素のPrismaクエリ。他ドメインの読み取り専用関数と
 * 同じパターン。features/wallet/server/get-balance.ts参照）。RLS
 * （group_invite_links_select_admin）でadmin以外にはnullが返る。
 */
export async function getInviteLink(userId: string, groupId: string) {
  return withRlsContext(userId, (tx) =>
    tx.groupInviteLink.findUnique({ where: { groupId } }),
  );
}

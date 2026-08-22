import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/** グループ管理（⑤）での招待URL取り消し。admin判定はRPC側が行う。 */
export async function revokeInviteLink(userId: string, groupId: string): Promise<void> {
  await withRlsContext(userId, (tx) =>
    tx.$executeRaw`SELECT revoke_group_invite_link(${groupId}::uuid)`,
  );
}

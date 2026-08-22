import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupInviteLinkRow } from "@/features/groups/types";

/** グループ管理（⑤）での招待URL発行/再発行。admin判定はRPC側が行う。 */
export async function createInviteLink(
  userId: string,
  groupId: string,
): Promise<GroupInviteLinkRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<GroupInviteLinkRow[]>`SELECT * FROM create_group_invite_link(${groupId}::uuid)`,
  );
  return rows[0];
}

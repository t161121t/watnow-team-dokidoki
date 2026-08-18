import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupMemberRow } from "@/features/groups/types";

export async function inviteMember(
  userId: string,
  groupId: string,
  targetUserId: string,
): Promise<GroupMemberRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<GroupMemberRow[]>`
      SELECT * FROM invite_member(${groupId}::uuid, ${targetUserId}::uuid)
    `,
  );
  return rows[0];
}

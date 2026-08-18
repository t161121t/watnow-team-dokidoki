import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupMemberRow } from "@/features/groups/types";

export async function updateGroupMemberRole(
  userId: string,
  groupId: string,
  targetUserId: string,
  role: "member" | "admin",
): Promise<GroupMemberRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<GroupMemberRow[]>`
      SELECT * FROM update_group_member_role(${groupId}::uuid, ${targetUserId}::uuid, ${role}::member_role)
    `,
  );
  return rows[0];
}

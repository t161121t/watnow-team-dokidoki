import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupMemberRow } from "@/features/groups/types";

export async function acceptInvite(
  userId: string,
  groupId: string,
): Promise<GroupMemberRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<GroupMemberRow[]>`SELECT * FROM accept_invite(${groupId}::uuid)`,
  );
  return rows[0];
}

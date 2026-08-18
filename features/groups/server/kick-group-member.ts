import "server-only";
import { withRlsContext } from "@/lib/db/rls";

export async function kickGroupMember(
  userId: string,
  groupId: string,
  targetUserId: string,
): Promise<void> {
  await withRlsContext(userId, (tx) =>
    tx.$executeRaw`SELECT kick_group_member(${groupId}::uuid, ${targetUserId}::uuid)`,
  );
}

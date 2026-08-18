import "server-only";
import { withRlsContext } from "@/lib/db/rls";

export async function leaveGroup(userId: string, groupId: string): Promise<void> {
  await withRlsContext(userId, (tx) =>
    tx.$executeRaw`SELECT leave_group(${groupId}::uuid)`,
  );
}

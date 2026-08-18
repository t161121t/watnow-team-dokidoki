import "server-only";
import { withRlsContext } from "@/lib/db/rls";

export async function declineInvite(userId: string, groupId: string): Promise<void> {
  await withRlsContext(userId, (tx) =>
    tx.$executeRaw`SELECT decline_invite(${groupId}::uuid)`,
  );
}

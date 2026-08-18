import "server-only";
import { withRlsContext } from "@/lib/db/rls";

export async function deleteSecretBeforeListing(
  userId: string,
  secretId: string,
): Promise<void> {
  await withRlsContext(userId, (tx) =>
    tx.$executeRaw`SELECT delete_secret_before_listing(${secretId}::uuid)`,
  );
}

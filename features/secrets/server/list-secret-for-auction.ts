import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionRow } from "@/features/secrets/types";

export async function listSecretForAuction(
  userId: string,
  secretGroupItemId: string,
): Promise<AuctionRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionRow[]>`
      SELECT * FROM list_secret_for_auction(${secretGroupItemId}::uuid)
    `,
  );
  return rows[0];
}

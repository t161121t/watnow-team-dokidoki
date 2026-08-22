import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionRow } from "@/features/auctions/types";

export async function approveDealerAssignment(
  userId: string,
  auctionId: string,
): Promise<AuctionRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionRow[]>`SELECT * FROM approve_dealer_assignment(${auctionId}::uuid)`,
  );
  return rows[0];
}

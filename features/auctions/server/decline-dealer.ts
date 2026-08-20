import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionRow } from "@/features/auctions/types";

export async function declineDealer(
  userId: string,
  auctionId: string,
): Promise<AuctionRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionRow[]>`SELECT * FROM decline_dealer(${auctionId}::uuid)`,
  );
  return rows[0];
}

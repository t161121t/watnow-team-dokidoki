import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionPublicViewRow } from "@/features/auctions/types";

/** オークション会場（⑩）用。auction_public_viewから1件取得する。 */
export async function getAuction(
  userId: string,
  auctionId: string,
): Promise<AuctionPublicViewRow | null> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionPublicViewRow[]>`
      SELECT * FROM auction_public_view WHERE auction_id = ${auctionId}::uuid
    `,
  );
  return rows[0] ?? null;
}

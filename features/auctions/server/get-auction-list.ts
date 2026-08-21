import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { AuctionPublicViewRow } from "@/features/auctions/types";

/** ⑨オークション一覧用。auction_public_view（グループ内で公開されている情報のみ）。 */
export async function getAuctionList(
  userId: string,
  groupId: string,
): Promise<AuctionPublicViewRow[]> {
  return withRlsContext(userId, (tx) =>
    tx.$queryRaw<AuctionPublicViewRow[]>`
      SELECT * FROM auction_public_view WHERE group_id = ${groupId}::uuid
      ORDER BY ends_at ASC NULLS LAST
    `,
  );
}

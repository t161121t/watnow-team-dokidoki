import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { BidRow } from "@/features/auctions/types";

export async function placeBid(
  userId: string,
  auctionId: string,
  amount: number,
): Promise<BidRow> {
  const rows = await withRlsContext(userId, (tx) =>
    // amountはint4引数のRPCへ渡すため::intを明示する
    // （features/secrets/server/register-secret.tsのレビュー指摘と同じ理由）。
    tx.$queryRaw<BidRow[]>`SELECT * FROM place_bid(${auctionId}::uuid, ${amount}::int)`,
  );
  return rows[0];
}

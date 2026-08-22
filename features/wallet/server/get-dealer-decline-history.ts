import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";

/**
 * ⑯関連秘密詳細（出品者ビュー）向け。get_dealer_decline_history RPC経由。
 * wallet_ledgerは本人のみselect可のため、出品者/adminが自分のオークションの
 * 辞退履歴を横断参照できるよう専用RPCを用意している（docs/DB.md §4.13、§6.3）。
 * 権限（出品者本人 or グループadmin）はRPC側で検証する。
 */
const auctionIdSchema = z.string().uuid();

export type DealerDeclineHistoryRow = {
  dealer_id: string;
  fee_amount: number;
  declined_at: Date;
};

export async function getDealerDeclineHistory(
  userId: string,
  auctionId: string,
): Promise<DealerDeclineHistoryRow[]> {
  const parsedAuctionId = auctionIdSchema.parse(auctionId);

  return withRlsContext(userId, (tx) =>
    tx.$queryRaw<DealerDeclineHistoryRow[]>`
      SELECT * FROM get_dealer_decline_history(${parsedAuctionId}::uuid)
    `,
  );
}

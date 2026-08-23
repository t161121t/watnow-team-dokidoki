// prisma/sql/auctions/*.sql のRPC・Viewが返す行の型（生SQLのカラム名=snake_case）。
// ドメイン間import禁止のため、featuresの他ドメイン（secretsのAuctionStatus等）と
// 定義が重複するが意図的（features/README.md参照）。
//
// timestamptz列は$queryRaw経由だとDateオブジェクトで返る（features/groups/types.ts
// のレビュー指摘で確認済み）。bid_count / rank（count(*)・RANK()の結果=int8）は、
// $queryRawの返り値型を決めるのはPrisma Client自体のデシリアライズ挙動であり
// （standalone pgドライバのデフォルト設定は無関係）、Prismaはint8をbigintとして
// 返すためbigint型とする（PR #56レビュー指摘、npm run verify:auctionsの実DB
// 実行で実際にbigintで返ることを確認済み）。React FlightはbigintをそのままServer
// Actionsの返り値としてシリアライズできる（node_modules/next/dist/compiled/
// react-server-dom-webpack内で確認）。

export type AuctionStatus =
  | "pending_dealer_approval"
  | "open"
  | "finalizing"
  | "sold"
  | "no_sale"
  | "canceled";

export type BidStatus = "valid" | "superseded" | "winning" | "canceled" | "failed";

export type AuctionRow = {
  id: string;
  group_id: string;
  secret_group_item_id: string;
  seller_id: string;
  dealer_id: string;
  status: AuctionStatus;
  starting_price: number;
  current_price: number;
  dealer_approved_at: Date | null;
  starts_at: Date | null;
  ends_at: Date | null;
  winner_id: string | null;
  winning_bid_id: string | null;
  final_price: number | null;
  listing_prepay_amount: number;
  seller_share_amount: number | null;
  dealer_share_amount: number | null;
  no_sale_depreciation_amount: number | null;
  created_at: Date;
  updated_at: Date;
  finalized_at: Date | null;
};

export type BidRow = {
  id: string;
  group_id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  status: BidStatus;
  created_at: Date;
};

export type AuctionPublicViewRow = {
  auction_id: string;
  group_id: string;
  secret_group_item_id: string;
  seller_id: string;
  dealer_id: string;
  category: string;
  rarity: number;
  title: string;
  status: AuctionStatus;
  current_price: number;
  starts_at: Date | null;
  ends_at: Date | null;
  // count(*)の結果（int8）。Prismaはbigintとして返す。
  bid_count: bigint;
};

/**
 * auction_dealer_summary_view（担当ディーラー本人にのみ公開されるsummary）。
 * auction_idが一致しなければ非担当ディーラー（そもそも行が返らない）。
 */
export type AuctionDealerSummaryViewRow = {
  auction_id: string;
  summary: string;
};

export type BidderIdentifiedViewRow = {
  auction_id: string;
  bid_id: string;
  bidder_id: string;
  bidder_nickname: string;
  amount: number;
  created_at: Date;
};

export type AnonymousBidFeedViewRow = {
  auction_id: string;
  amount: number;
  created_at: Date;
  // RANK()の結果（int8）。bid_countと同じ理由でbigint。
  rank: bigint;
};

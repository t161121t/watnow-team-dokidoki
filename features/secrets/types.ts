// prisma/sql/secrets/*.sql のRPC・Viewが返す行の型（生SQLのカラム名=snake_case）。
// UIに渡す前提のcamelCase変換はUI接続時に方針を決める（features/groups/types.ts
// と同じ方針）。timestamptz列は$queryRaw経由だとDateオブジェクトで返る
// （features/groups/types.tsのレビュー指摘で確認済み）。

export type SecretRow = {
  id: string;
  owner_id: string;
  body: string;
  title: string;
  summary: string;
  category: string;
  rarity: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
};

export type SecretGroupItemStatus =
  | "registered"
  | "listed"
  | "on_auction"
  | "sold"
  | "returned"
  | "withdrawn";

export type SecretGroupItemRow = {
  id: string;
  secret_id: string;
  group_id: string;
  status: SecretGroupItemStatus;
  asking_price: number;
  current_value: number;
  created_at: Date;
  updated_at: Date;
};

export type AuctionStatus =
  | "pending_dealer_approval"
  | "open"
  | "finalizing"
  | "sold"
  | "no_sale"
  | "canceled";

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

export type MySecretCollectionRow = {
  group_id: string;
  auction_id: string;
  secret_id: string;
  category: string;
  rarity: number;
  title: string;
  body: string;
  seller_id: string;
  granted_at: Date | null;
};

/**
 * 秘密リスト（⑬）カード表示用の共通UI型。owner/dealer/winnerいずれの
 * タブも、由来（secret_group_items / auction_public_view /
 * my_secret_collection_view）が異なるためこの形に正規化してから渡す
 * （issue #71系のグループ管理画面接続と同じ「UI型はページ側で組み立てる」方針）。
 */
export type SecretListItem = {
  id: string;
  groupId: string;
  viewRole: "owner" | "dealer" | "winner";
  title: string;
  category: string;
  rarity: number;
  value: number;
  badgeLabel?: string;
};

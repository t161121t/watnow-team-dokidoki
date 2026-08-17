-- docs/DB.md §5.1〜§5.3
-- これらのviewはbids/secretsの行レベルRLSより広い範囲を意図的に見せるため、
-- security_invoker は付けない（view所有者権限で読む。WHERE句が唯一のアクセス制御）。
-- bidder_identified_view / anonymous_bid_feed_view は dealer_decline_history_view と
-- 同種の「本人限定テーブルをviewで横断参照する」パターンであり、DB.md上はview設計として
-- 承認済みだが、WHERE句を書き間違えるリスクは同じ種類なので実装レビュー時に要注意。

CREATE OR REPLACE VIEW auction_public_view AS
SELECT
  a.id AS auction_id,
  a.group_id,
  a.secret_group_item_id,
  a.seller_id,
  a.dealer_id,
  s.category,
  s.rarity,
  s.summary,
  a.status,
  a.current_price,
  a.starts_at,
  a.ends_at,
  (SELECT count(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
FROM auctions a
JOIN secret_group_items sgi ON sgi.id = a.secret_group_item_id
JOIN secrets s ON s.id = sgi.secret_id
WHERE is_group_member(a.group_id);

CREATE OR REPLACE VIEW bidder_identified_view AS
SELECT
  b.auction_id,
  b.id AS bid_id,
  b.bidder_id,
  u.nickname AS bidder_nickname,
  b.amount,
  b.created_at
FROM bids b
JOIN auctions a ON a.id = b.auction_id
JOIN users u ON u.id = b.bidder_id
WHERE a.seller_id = auth.uid() OR a.dealer_id = auth.uid();

CREATE OR REPLACE VIEW anonymous_bid_feed_view AS
SELECT
  b.auction_id,
  b.amount,
  b.created_at,
  RANK() OVER (PARTITION BY b.auction_id ORDER BY b.amount DESC, b.created_at ASC) AS rank
FROM bids b
JOIN auctions a ON a.id = b.auction_id
WHERE is_group_member(a.group_id);

GRANT SELECT ON auction_public_view TO authenticated;
GRANT SELECT ON bidder_identified_view TO authenticated;
GRANT SELECT ON anonymous_bid_feed_view TO authenticated;

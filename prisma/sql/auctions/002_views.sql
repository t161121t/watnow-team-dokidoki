-- docs/DB.md §5.1〜§5.3
-- これらのviewはbids/secretsの行レベルRLSより広い範囲を意図的に見せるため、
-- security_invoker は付けない（view所有者権限で読む。WHERE句が唯一のアクセス制御）。
-- bidder_identified_view / anonymous_bid_feed_view は dealer_decline_history_view と
-- 同種の「本人限定テーブルをviewで横断参照する」パターンであり、DB.md上はview設計として
-- 承認済みだが、WHERE句を書き間違えるリスクは同じ種類なので実装レビュー時に要注意。
--
-- 2026-08-18レビュー反映: bidder_identified_view は seller_id/dealer_id の一致だけで
-- 判定しており、脱退/kick後も記録上のseller/dealerとして永続的に入札者を閲覧できて
-- しまっていた。is_group_member(現在activeか)も条件に加える。
--
-- 2026-08-23 ユーザー報告反映: auction_public_viewはグループメンバー全員に見えるため、
-- ここにsummary（ディーラー限定の補足説明。docs/DB.md §4.8参照）を含めていたのは
-- 過剰公開だった。titleに差し替える。ディーラー自身がsummaryを読む経路は
-- auction_dealer_summary_viewを新設して分離した。summary列をtitle列に
-- 差し替えるため、CREATE OR REPLACEでは列名変更できずDROPしてから作り直す
-- （PostgreSQL: cannot change name of view column）。

DROP VIEW IF EXISTS auction_public_view;
CREATE OR REPLACE VIEW auction_public_view AS
SELECT
  a.id AS auction_id,
  a.group_id,
  a.secret_group_item_id,
  a.seller_id,
  a.dealer_id,
  s.category,
  s.rarity,
  s.title,
  a.status,
  a.current_price,
  a.starts_at,
  a.ends_at,
  (SELECT count(*) FROM bids b WHERE b.auction_id = a.id) AS bid_count
FROM auctions a
JOIN secret_group_items sgi ON sgi.id = a.secret_group_item_id
JOIN secrets s ON s.id = sgi.secret_id
WHERE is_group_member(a.group_id);

-- summary（ディーラー限定の補足説明）は担当ディーラー本人にのみ公開する。
-- bidder_identified_viewと同種の「本人限定でsecretsテーブルを横断参照する」
-- パターン（このファイル冒頭のコメント参照）。
DROP VIEW IF EXISTS auction_dealer_summary_view;
CREATE OR REPLACE VIEW auction_dealer_summary_view AS
SELECT
  a.id AS auction_id,
  s.summary
FROM auctions a
JOIN secret_group_items sgi ON sgi.id = a.secret_group_item_id
JOIN secrets s ON s.id = sgi.secret_id
WHERE is_group_member(a.group_id) AND a.dealer_id = auth.uid();

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
WHERE is_group_member(a.group_id)
  AND (a.seller_id = auth.uid() OR a.dealer_id = auth.uid());

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
GRANT SELECT ON auction_dealer_summary_view TO authenticated;
GRANT SELECT ON bidder_identified_view TO authenticated;
GRANT SELECT ON anonymous_bid_feed_view TO authenticated;

-- docs/DB.md §5.4 my_secret_collection_view
-- secret_accesses廃止に伴い、auctions.winner_id / secrets.owner_id を直接参照する形に変更。
-- security_invoker=true にして、呼び出し元のRLSを二重にかける（view定義のWHEREが
-- 間違っていた場合の保険として、secrets/auctions自体のRLSも効かせる）。
--
-- 2026-08-23 ユーザー報告反映: summary（ディーラー限定の補足説明）はwinnerにも
-- 見えてしまっていたためtitleに差し替える（docs/DB.md §4.8参照。ownerは
-- secretsテーブルへの直接アクセス経路（getMySecretItem）でsummaryも見られる
-- ため、この一覧からsummaryを外しても支障はない）。summary列をtitle列に
-- 差し替えるため、CREATE OR REPLACEでは列名変更できずDROPしてから作り直す
-- （PostgreSQL: cannot change name of view column）。

DROP VIEW IF EXISTS my_secret_collection_view;
CREATE OR REPLACE VIEW my_secret_collection_view
WITH (security_invoker = true) AS
SELECT
  sgi.group_id,
  a.id AS auction_id,
  s.id AS secret_id,
  s.category,
  s.rarity,
  s.title,
  s.body,
  a.seller_id,
  a.finalized_at AS granted_at
FROM auctions a
JOIN secret_group_items sgi ON sgi.id = a.secret_group_item_id
JOIN secrets s ON s.id = sgi.secret_id
WHERE (a.winner_id = auth.uid() AND a.status = 'sold')
   OR s.owner_id = auth.uid();

GRANT SELECT ON my_secret_collection_view TO authenticated;

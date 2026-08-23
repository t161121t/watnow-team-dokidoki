-- docs/DB.md §5.4 my_secret_collection_view
-- secret_accesses廃止に伴い、auctions.winner_id / secrets.owner_id を直接参照する形に変更。
--
-- 2026-08-23 ユーザー報告反映: summary（ディーラー限定の補足説明）はwinnerにも
-- 見えてしまっていたためtitleに差し替える（docs/DB.md §4.8参照。ownerは
-- secretsテーブルへの直接アクセス経路（getMySecretItem）でsummaryも見られる
-- ため、この一覧からsummaryを外しても支障はない）。summary列をtitle列に
-- 差し替えるため、CREATE OR REPLACEでは列名変更できずDROPしてから作り直す
-- （PostgreSQL: cannot change name of view column）。
--
-- 2026-08-23 Codexレビュー指摘反映: security_invoker=true（呼び出し元のRLSも
-- 効かせる二重チェック）は、secrets側のRLSがwinnerにも行アクセスを許して
-- いた間はこのviewのWHERE句と一致していたため機能していたが、
-- secrets_select_owner_or_winnerをowner限定に絞った今、security_invoker=trueの
-- ままだとwinnerがこのviewからも一切読めなくなってしまう。auction_public_view等
-- 他のviewと同じ「WHERE句のみでアクセス制御する」パターンに合わせ、
-- security_invokerを外す（prisma/sql/secrets/001_rls.sqlのコメント参照）。

DROP VIEW IF EXISTS my_secret_collection_view;
CREATE OR REPLACE VIEW my_secret_collection_view AS
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

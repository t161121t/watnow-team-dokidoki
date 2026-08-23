-- docs/DB.md §4.8, §4.9, §7.2
--
-- 2026-08-23 Codexレビュー指摘反映: このRLSはRow単位の制御で列単位では制御できない
-- ため、winnerにこのpolicy経由でsecrets行へのSELECTを許すと、PostgRESTの
-- /rest/v1/secrets経由でsummary（ディーラー限定にしたい列。docs/DB.md §4.8参照）
-- まで直接読めてしまっていた（my_secret_collection_viewがsummaryを含めなく
-- しても、base tableへの直接アクセス経路は別途残っていたため無意味だった）。
-- winnerのsecrets参照はmy_secret_collection_view（summaryを含まない）経由に
-- 一本化し、ここではowner本人のみ許可する。

ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS secrets_select_owner_or_winner ON secrets;
DROP POLICY IF EXISTS secrets_select_owner ON secrets;
CREATE POLICY secrets_select_owner ON secrets
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS secrets_insert_own ON secrets;
CREATE POLICY secrets_insert_own ON secrets
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS secrets_update_own_before_listing ON secrets;
CREATE POLICY secrets_update_own_before_listing ON secrets
  FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM secret_group_items sgi
      WHERE sgi.secret_id = secrets.id AND sgi.status <> 'registered'
    )
  )
  WITH CHECK (owner_id = auth.uid());

ALTER TABLE secret_group_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS secret_group_items_select_member ON secret_group_items;
CREATE POLICY secret_group_items_select_member ON secret_group_items
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

-- insert/updateはregister_secret/update_secret_before_listing/list_secret_for_auction
-- RPC経由のみ（直接ポリシーは定義しない）

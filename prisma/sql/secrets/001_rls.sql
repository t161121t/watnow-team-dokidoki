-- docs/DB.md §4.8, §4.9, §7.2

ALTER TABLE secrets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS secrets_select_owner_or_winner ON secrets;
CREATE POLICY secrets_select_owner_or_winner ON secrets
  FOR SELECT
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM auctions a
      JOIN secret_group_items sgi ON sgi.id = a.secret_group_item_id
      WHERE sgi.secret_id = secrets.id
        AND a.status = 'sold'
        AND a.winner_id = auth.uid()
    )
  );

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

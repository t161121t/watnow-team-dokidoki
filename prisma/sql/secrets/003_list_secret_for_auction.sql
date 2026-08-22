-- docs/DB.md §6.2, §10.0
-- listed化、auctions行作成（status=pending_dealer_approval、starts_at/ends_atはnull）、
-- dealerランダム選抜
--
-- 2026-08-18 PRレビュー反映:
-- - 脱退/kick後でも旧owner権限だけでlistできてしまったため is_group_member を追加
-- - soft delete済み(deleted_at)のsecretをlistできてしまったため除外
-- - no_sale後returnedになったitemを再出品できなかったため registered/returned 両方を許可し、
--   価格基準は asking_price ではなく current_value（目減り後の価値）を使う
--
-- 2026-08-23 ユーザー報告反映: 前払い（P4）のcreditは、以前はここ（出品/list時点）
-- で行っていたが、approve_dealer_assignmentに移した。ディーラーが承認する前に
-- 出品者へポイントが動いてしまうと、ディーラーが辞退を繰り返して最終的に
-- 承認可能なディーラーがいなくなった場合（no eligible dealer）でも、出品者は
-- 既に前払いを受け取ったままになってしまうため（listing_prepay_amount自体は
-- ここでauctions行に確定させておき、実際のcreditはapprove_dealer_assignment側で行う）。

CREATE OR REPLACE FUNCTION list_secret_for_auction(p_secret_group_item_id uuid)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item secret_group_items;
  v_seller_id uuid;
  v_deleted_at timestamptz;
  v_dealer_id uuid;
  v_price int;
  v_auction auctions;
BEGIN
  SELECT sgi.* INTO v_item
  FROM secret_group_items sgi
  WHERE sgi.id = p_secret_group_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'list_secret_for_auction: not found';
  END IF;

  SELECT s.owner_id, s.deleted_at INTO v_seller_id, v_deleted_at
  FROM secrets s WHERE s.id = v_item.secret_id;

  IF v_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'list_secret_for_auction: not authorized';
  END IF;

  IF NOT is_group_member(v_item.group_id) THEN
    RAISE EXCEPTION 'list_secret_for_auction: not a member of this group';
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'list_secret_for_auction: secret has been deleted';
  END IF;

  IF v_item.status NOT IN ('registered', 'returned') THEN
    RAISE EXCEPTION 'list_secret_for_auction: item is not in registered or returned status';
  END IF;

  -- registeredなら asking_price、returned（再出品）なら目減り後の current_value を基準にする
  v_price := v_item.current_value;

  -- P8: 出品者以外からランダムにディーラーを選抜
  SELECT gm.user_id INTO v_dealer_id
  FROM group_members gm
  WHERE gm.group_id = v_item.group_id
    AND gm.status = 'active'
    AND gm.user_id <> v_seller_id
  ORDER BY random()
  LIMIT 1;

  IF v_dealer_id IS NULL THEN
    RAISE EXCEPTION 'list_secret_for_auction: no eligible dealer in this group';
  END IF;

  -- P3: 開始価格 = （再出品後の）出品価格と同額
  INSERT INTO auctions (
    id, group_id, secret_group_item_id, seller_id, dealer_id, status,
    starting_price, current_price, listing_prepay_amount, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_item.group_id, v_item.id, v_seller_id, v_dealer_id, 'pending_dealer_approval',
    v_price, v_price, v_price, now(), now()
  ) RETURNING * INTO v_auction;

  UPDATE secret_group_items SET status = 'listed', updated_at = now() WHERE id = v_item.id;

  -- P4の前払いcredit（出品価格と同額、100%）はapprove_dealer_assignmentで
  -- ディーラー承認時に行う（上記コメント参照）。

  RETURN v_auction;
END;
$$;

REVOKE EXECUTE ON FUNCTION list_secret_for_auction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_secret_for_auction(uuid) TO authenticated;

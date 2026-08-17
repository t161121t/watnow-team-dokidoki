-- docs/DB.md §6.2, §10.0
-- listed化、auctions行作成（status=pending_dealer_approval、starts_at/ends_atはnull）、
-- dealerランダム選抜、前払いcredit（P4=出品価格と同額）

CREATE OR REPLACE FUNCTION list_secret_for_auction(p_secret_group_item_id uuid)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item secret_group_items;
  v_seller_id uuid;
  v_dealer_id uuid;
  v_auction auctions;
BEGIN
  SELECT sgi.* INTO v_item
  FROM secret_group_items sgi
  WHERE sgi.id = p_secret_group_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'list_secret_for_auction: not found';
  END IF;

  SELECT s.owner_id INTO v_seller_id FROM secrets s WHERE s.id = v_item.secret_id;

  IF v_seller_id <> auth.uid() THEN
    RAISE EXCEPTION 'list_secret_for_auction: not authorized';
  END IF;

  IF v_item.status <> 'registered' THEN
    RAISE EXCEPTION 'list_secret_for_auction: item is not in registered status';
  END IF;

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

  -- P3: 開始価格 = 出品価格と同額
  INSERT INTO auctions (
    id, group_id, secret_group_item_id, seller_id, dealer_id, status,
    starting_price, current_price, listing_prepay_amount, created_at, updated_at
  ) VALUES (
    gen_random_uuid(), v_item.group_id, v_item.id, v_seller_id, v_dealer_id, 'pending_dealer_approval',
    v_item.asking_price, v_item.asking_price, v_item.asking_price, now(), now()
  ) RETURNING * INTO v_auction;

  UPDATE secret_group_items SET status = 'listed', updated_at = now() WHERE id = v_item.id;

  -- P4: 前払い = 出品価格と同額（100%）
  PERFORM _credit_wallet(v_item.group_id, v_seller_id, v_item.asking_price, 'listing_prepay', 'secret_group_items', v_item.id);

  RETURN v_auction;
END;
$$;

REVOKE EXECUTE ON FUNCTION list_secret_for_auction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION list_secret_for_auction(uuid) TO authenticated;

-- docs/DB.md §6.3, §10.0

CREATE OR REPLACE FUNCTION approve_dealer_assignment(p_auction_id uuid)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions;
  v_open_seconds int;
BEGIN
  SELECT * INTO v_auction FROM auctions
  WHERE id = p_auction_id AND status = 'pending_dealer_approval'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'approve_dealer_assignment: auction not found or not pending approval';
  END IF;

  IF v_auction.dealer_id <> auth.uid() THEN
    RAISE EXCEPTION 'approve_dealer_assignment: not authorized';
  END IF;

  SELECT auction_open_seconds INTO v_open_seconds FROM groups WHERE id = v_auction.group_id;

  UPDATE auctions
  SET dealer_approved_at = now(),
      starts_at = now(),
      ends_at = now() + make_interval(secs => v_open_seconds),
      status = 'open',
      updated_at = now()
  WHERE id = p_auction_id
  RETURNING * INTO v_auction;

  UPDATE secret_group_items SET status = 'on_auction', updated_at = now()
  WHERE id = v_auction.secret_group_item_id;

  RETURN v_auction;
END;
$$;

CREATE OR REPLACE FUNCTION decline_dealer(p_auction_id uuid)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions;
  v_asking_price int;
  v_fee int;
  v_new_dealer uuid;
BEGIN
  SELECT * INTO v_auction FROM auctions
  WHERE id = p_auction_id AND status = 'pending_dealer_approval'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decline_dealer: auction not found, or already open (decline only allowed before start)';
  END IF;

  IF v_auction.dealer_id <> auth.uid() THEN
    RAISE EXCEPTION 'decline_dealer: not authorized';
  END IF;

  SELECT asking_price INTO v_asking_price FROM secret_group_items WHERE id = v_auction.secret_group_item_id;
  -- P12確定=5%。features/auctions/constants.ts の dealerDeclineFeeRate と一致させること
  v_fee := floor(v_asking_price * 0.05);

  IF v_fee > 0 THEN
    PERFORM _debit_wallet(v_auction.group_id, auth.uid(), v_fee, 'dealer_decline_fee', 'auctions', v_auction.id, true);
  END IF;

  SELECT gm.user_id INTO v_new_dealer
  FROM group_members gm
  WHERE gm.group_id = v_auction.group_id
    AND gm.status = 'active'
    AND gm.user_id <> v_auction.seller_id
    AND gm.user_id <> v_auction.dealer_id
  ORDER BY random()
  LIMIT 1;

  IF v_new_dealer IS NULL THEN
    RAISE EXCEPTION 'decline_dealer: no other eligible dealer in this group';
  END IF;

  UPDATE auctions
  SET dealer_id = v_new_dealer, updated_at = now()
  WHERE id = p_auction_id
  RETURNING * INTO v_auction;

  RETURN v_auction;
END;
$$;

REVOKE EXECUTE ON FUNCTION approve_dealer_assignment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION approve_dealer_assignment(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION decline_dealer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_dealer(uuid) TO authenticated;

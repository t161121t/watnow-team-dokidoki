-- docs/DB.md §6.3, §10.1
-- エスクローなし。insert時点ではwalletを減らさない

CREATE OR REPLACE FUNCTION place_bid(p_auction_id uuid, p_amount int)
RETURNS bids
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions;
  v_balance int;
  v_bid bids;
BEGIN
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'place_bid: auction not found';
  END IF;

  IF NOT is_group_member(v_auction.group_id) THEN
    RAISE EXCEPTION 'place_bid: not a member of this group';
  END IF;

  IF v_auction.status <> 'open' THEN
    RAISE EXCEPTION 'place_bid: auction is not open';
  END IF;

  IF now() < v_auction.starts_at OR now() > v_auction.ends_at THEN
    RAISE EXCEPTION 'place_bid: auction is not within its bidding window';
  END IF;

  IF auth.uid() = v_auction.seller_id THEN
    RAISE EXCEPTION 'place_bid: seller cannot bid on own auction';
  END IF;

  IF auth.uid() = v_auction.dealer_id THEN
    RAISE EXCEPTION 'place_bid: dealer cannot bid on this auction';
  END IF;

  IF p_amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'place_bid: amount must exceed current price';
  END IF;

  SELECT balance INTO v_balance FROM wallets
  WHERE group_id = v_auction.group_id AND user_id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND OR v_balance < p_amount THEN
    RAISE EXCEPTION 'place_bid: insufficient balance';
  END IF;

  INSERT INTO bids (id, group_id, auction_id, bidder_id, amount, status, created_at)
  VALUES (gen_random_uuid(), v_auction.group_id, p_auction_id, auth.uid(), p_amount, 'valid', now())
  RETURNING * INTO v_bid;

  UPDATE auctions SET current_price = p_amount, updated_at = now() WHERE id = p_auction_id;

  RETURN v_bid;
END;
$$;

REVOKE EXECUTE ON FUNCTION place_bid(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION place_bid(uuid, int) TO authenticated;

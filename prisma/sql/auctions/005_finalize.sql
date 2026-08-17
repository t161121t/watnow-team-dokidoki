-- docs/DB.md §6.3, §10.2, §10.2.1, §10.3
-- Stage A: claim_auction_for_finalize（軽量・cron重複起動対策）
-- Stage B: finalize_auction（次点繰り上げ込みの本体。残高不足なら no_sale へ）

CREATE OR REPLACE FUNCTION claim_auction_for_finalize(p_auction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated int;
BEGIN
  UPDATE auctions
  SET status = 'finalizing', updated_at = now()
  WHERE id = p_auction_id AND status = 'open' AND ends_at <= now();

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$;

-- 不落札処理（finalize_auctionからのみ呼ばれる内部関数）
CREATE OR REPLACE FUNCTION _finalize_no_sale(p_auction auctions)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_asking_price int;
  v_depreciation int;
  v_new_value int;
  v_result auctions;
BEGIN
  SELECT asking_price INTO v_asking_price FROM secret_group_items WHERE id = p_auction.secret_group_item_id;

  -- 前払い（P4=出品価格と同額）を全額没収。目減り率とは独立した処理
  PERFORM _debit_wallet(p_auction.group_id, p_auction.seller_id, p_auction.listing_prepay_amount, 'listing_reclaim', 'auctions', p_auction.id, true);

  -- P6確定=20%。features/auctions/constants.ts の noSaleDepreciationRate と一致させること
  v_depreciation := round(v_asking_price * 0.20);
  v_new_value := v_asking_price - v_depreciation;

  UPDATE secret_group_items
  SET current_value = v_new_value, status = 'returned', updated_at = now()
  WHERE id = p_auction.secret_group_item_id;

  UPDATE auctions
  SET status = 'no_sale',
      no_sale_depreciation_amount = v_depreciation,
      finalized_at = now(),
      updated_at = now()
  WHERE id = p_auction.id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION finalize_auction(p_auction_id uuid)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions;
  v_candidate RECORD;
  v_winner_bid bids;
  v_candidate_balance int;
  v_seller_share int;
  v_dealer_share int;
  v_result auctions;
BEGIN
  SELECT * INTO v_auction FROM auctions
  WHERE id = p_auction_id AND status = 'finalizing'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'finalize_auction: auction not found or not in finalizing status (possible double execution)';
  END IF;

  v_winner_bid := NULL;

  -- 次点繰り上げ（§10.2.1）: 入札額降順・同額はcreated_at昇順
  FOR v_candidate IN
    SELECT * FROM bids
    WHERE auction_id = p_auction_id AND status = 'valid'
    ORDER BY amount DESC, created_at ASC
  LOOP
    SELECT balance INTO v_candidate_balance
    FROM wallets
    WHERE group_id = v_auction.group_id AND user_id = v_candidate.bidder_id
    FOR UPDATE;

    IF v_candidate_balance >= v_candidate.amount THEN
      v_winner_bid := v_candidate;
      EXIT;
    ELSE
      UPDATE bids SET status = 'failed' WHERE id = v_candidate.id;
    END IF;
  END LOOP;

  IF v_winner_bid IS NULL THEN
    v_result := _finalize_no_sale(v_auction);
    RETURN v_result;
  END IF;

  UPDATE bids SET status = 'winning' WHERE id = v_winner_bid.id;

  PERFORM _debit_wallet(v_auction.group_id, v_winner_bid.bidder_id, v_winner_bid.amount, 'winning_bid_debit', 'auctions', v_auction.id, false);

  -- P7確定=出品者70%:ディーラー30%。端数は出品者側の切り捨て分をディーラーへ寄せる
  v_seller_share := floor(v_winner_bid.amount * 0.70);
  v_dealer_share := v_winner_bid.amount - v_seller_share;

  PERFORM _credit_wallet(v_auction.group_id, v_auction.seller_id, v_seller_share, 'seller_share_credit', 'auctions', v_auction.id);
  PERFORM _credit_wallet(v_auction.group_id, v_auction.dealer_id, v_dealer_share, 'dealer_share_credit', 'auctions', v_auction.id);

  UPDATE secret_group_items SET status = 'sold', updated_at = now()
  WHERE id = v_auction.secret_group_item_id;

  UPDATE auctions
  SET status = 'sold',
      winner_id = v_winner_bid.bidder_id,
      winning_bid_id = v_winner_bid.id,
      final_price = v_winner_bid.amount,
      seller_share_amount = v_seller_share,
      dealer_share_amount = v_dealer_share,
      finalized_at = now(),
      updated_at = now()
  WHERE id = p_auction_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

-- cron用。個別のclaim/finalizeはユーザーからも呼べるが、これは一括処理なのでservice role限定
CREATE OR REPLACE FUNCTION finalize_due_auctions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  FOR v_id IN
    SELECT id FROM auctions WHERE status = 'open' AND ends_at <= now()
  LOOP
    IF claim_auction_for_finalize(v_id) THEN
      PERFORM finalize_auction(v_id);
    END IF;
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION _finalize_no_sale(auctions) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION claim_auction_for_finalize(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION claim_auction_for_finalize(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finalize_auction(uuid) TO authenticated;

-- finalize_due_auctions は authenticated へ GRANT しない（withServiceRole 経由のみ想定。docs/アーキテクチャ.md §2.1）
REVOKE EXECUTE ON FUNCTION finalize_due_auctions() FROM PUBLIC;

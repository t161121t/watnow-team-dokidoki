-- docs/DB.md §6.3, §10.2, §10.2.1, §10.3
-- Stage A: claim_auction_for_finalize（軽量・cron重複起動対策）
-- Stage B: finalize_auction（次点繰り上げ込みの本体。残高不足なら no_sale へ）
--
-- 2026-08-18 PRレビュー反映:
-- - claim_auction_for_finalize/finalize_auctionはauthenticatedへGRANTしない
--   （service role専用に変更。auction UUIDさえ知っていれば脱退後のグループでも
--   叩けてしまう問題があった。is_group_memberでの防御も検討したが、cronは
--   auth.uid()が取れないservice role文脈で動くため素直にGRANTを外す方が
--   境界が明確、という指摘を採用）
-- - finalize_auction内のwalletロックを、bidder候補ごとに個別取得する順序から
--   「関係する全wallet（候補bidder+seller+dealer）をuser_id昇順で先に一括ロック」
--   する方式に変更（クロスしたロック順序によるデッドロックを防ぐ）
-- - finalize_due_auctionsに、claim済みのままStage Bが完了しなかった
--   （プロセス異常終了等）finalizingオークションを拾い直す復旧経路を追加

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
  v_lock_user_id uuid;
  v_candidate RECORD;
  v_winner_bid bids;
  v_candidate_balance int;
  v_candidate_expired boolean;
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

  -- デッドロック対策: このオークションに関わる可能性のある全wallet
  -- （有効なbidder候補 + seller + dealer）を、user_id昇順で先に一括ロックする。
  -- 個別に評価しながら都度ロックすると、他auctionのfinalizeとクロスした
  -- 順序でロックし合いデッドロックし得るため（レビュー指摘）。
  FOR v_lock_user_id IN
    SELECT DISTINCT uid FROM (
      SELECT bidder_id AS uid FROM bids WHERE auction_id = p_auction_id AND status = 'valid'
      UNION
      SELECT v_auction.seller_id
      UNION
      SELECT v_auction.dealer_id
    ) ids
    ORDER BY uid
  LOOP
    PERFORM 1 FROM wallets
    WHERE group_id = v_auction.group_id AND user_id = v_lock_user_id
    FOR UPDATE;
  END LOOP;

  v_winner_bid := NULL;

  -- 次点繰り上げ（§10.2.1）: 入札額降順・同額はcreated_at昇順
  -- walletは上のループで既にロック済みなので、ここでは再ロックせず参照するだけ
  FOR v_candidate IN
    SELECT * FROM bids
    WHERE auction_id = p_auction_id AND status = 'valid'
    ORDER BY amount DESC, created_at ASC
  LOOP
    SELECT balance, (expired_at IS NOT NULL) INTO v_candidate_balance, v_candidate_expired
    FROM wallets
    WHERE group_id = v_auction.group_id AND user_id = v_candidate.bidder_id;

    IF NOT v_candidate_expired AND v_candidate_balance >= v_candidate.amount THEN
      v_winner_bid := v_candidate;
      EXIT;
    ELSE
      -- 残高不足、またはfinalize時点で既に脱退/kickされている場合は無効化して次点へ
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

  -- 注意: seller/dealerが脱退/kickされていた場合、_credit_walletは
  -- expired walletに対して例外を投げてfinalize全体を中断する。この場合auctionは
  -- finalizingのまま残り、finalize_due_auctionsの復旧経路が再試行し続けるが、
  -- 根本解決には至らない（has_active_auction_involvementでleave/kick自体は
  -- 事前に防いでいるが、承認後にexpireする経路が完全に塞がっているわけではない）。
  -- 既知の残課題としてPRに明記する。
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

-- cron用。開催終了したopenオークションの確定に加え、claim済みのままStage Bが
-- 完了しなかった（プロセス異常終了等）finalizingオークションの復旧も行う。
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

  -- 復旧経路: 5分以上 finalizing のまま止まっているものを拾い直す
  FOR v_id IN
    SELECT id FROM auctions WHERE status = 'finalizing' AND updated_at < now() - interval '5 minutes'
  LOOP
    PERFORM finalize_auction(v_id);
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION _finalize_no_sale(auctions) FROM PUBLIC;

-- claim_auction_for_finalize / finalize_auction / finalize_due_auctions は
-- authenticated へ GRANT しない（service role専用。docs/アーキテクチャ.md §2.1
-- withServiceRole 参照）。
REVOKE EXECUTE ON FUNCTION claim_auction_for_finalize(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_auction(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION finalize_due_auctions() FROM PUBLIC;

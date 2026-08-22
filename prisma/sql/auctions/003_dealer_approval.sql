-- docs/DB.md §6.3, §10.0
-- 2026-08-18レビュー反映: dealer_id = auth.uid() だけでなく、現在も active member で
-- あることを確認する（割り当て後に脱退/kickされたユーザーが承認/辞退できてしまうため）。
-- 辞退料の基準は secret_group_items.asking_price（再出品後は古い値になりうる）ではなく、
-- このオークション自体の listing_prepay_amount（listing時に確定した実際の価格基準）を使う。
--
-- 2026-08-23 ユーザー報告反映: 出品時の前払い（P4）creditは、以前は
-- list_secret_for_auction（出品/list時点）で行っていたが、ここ（ディーラー承認時）に
-- 移した。承認前に出品者へポイントが動いてしまうと、ディーラーが辞退を繰り返して
-- 最終的に承認可能なディーラーがいなくなった場合でも、出品者は前払いを受け取った
-- ままになってしまうため（prisma/sql/secrets/003_list_secret_for_auction.sql参照）。
--
-- 2026-08-23 Codexレビュー指摘反映: db:sqlは関数を置き換えるだけでバージョン管理が
-- ないため、この変更をデプロイした時点で既にpending_dealer_approval状態のオークション
-- （旧list_secret_for_auctionで出品時に前払い済み）が存在すると、承認時にここで
-- 二重creditしてしまう。wallet_ledgerに同じ(kind, ref_table, ref_id)の前払いが
-- 既に存在するか確認し、あれば重複creditをスキップすることで冪等にする
-- （list_secret_for_auction側でも同じkind/ref_table/ref_idの組み合わせを使っていた
-- ため、この2関数間でのみ意味を持つ判定として安全）。

CREATE OR REPLACE FUNCTION approve_dealer_assignment(p_auction_id uuid)
RETURNS auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction auctions;
  v_open_seconds int;
  v_already_credited boolean;
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

  IF NOT is_group_member(v_auction.group_id) THEN
    RAISE EXCEPTION 'approve_dealer_assignment: not an active member of this group';
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

  -- P4: 前払い = 出品価格と同額（100%）。承認が確定した時点で初めて出品者へ渡す。
  -- デプロイ境界での二重credit防止（上記コメント参照）。
  SELECT EXISTS (
    SELECT 1 FROM wallet_ledger
    WHERE kind = 'listing_prepay'
      AND ref_table = 'secret_group_items'
      AND ref_id = v_auction.secret_group_item_id
  ) INTO v_already_credited;

  IF NOT v_already_credited THEN
    PERFORM _credit_wallet(
      v_auction.group_id, v_auction.seller_id, v_auction.listing_prepay_amount,
      'listing_prepay', 'secret_group_items', v_auction.secret_group_item_id
    );
  END IF;

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

  IF NOT is_group_member(v_auction.group_id) THEN
    RAISE EXCEPTION 'decline_dealer: not an active member of this group';
  END IF;

  -- P12確定=5%。features/auctions/constants.ts の dealerDeclineFeeRate と一致させること
  v_fee := floor(v_auction.listing_prepay_amount * 0.05);

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

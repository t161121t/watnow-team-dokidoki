-- docs/DB.md §4.13, §6.3
-- wallet_ledgerは本人のみselect可なため、出品者/adminが自分のオークションの
-- 辞退履歴を横断参照するための専用RPC（view経由の迂回はレビューで不採用に変更した）。
--
-- 2026-08-22 PRレビュー反映: 旧実装は「出品者本人 or admin」のみを判定しており、
-- 出品者本人であってもグループを脱退/kickされた後は見えなくなる、という他の
-- auction view（bidder_identified_view等。2026-08-18レビュー反映）と同じ
-- 境界になっていなかった（auction UUIDさえ知っていれば脱退後も辞退履歴を
-- 取得できてしまっていた）。is_group_member(v_group_id)を明示的に追加し、
-- 「現在もactiveなgroup memberであること」を必須条件にした。

CREATE OR REPLACE FUNCTION get_dealer_decline_history(p_auction_id uuid)
RETURNS TABLE (
  dealer_id uuid,
  fee_amount int,
  declined_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id uuid;
  v_seller_id uuid;
BEGIN
  SELECT group_id, seller_id INTO v_group_id, v_seller_id
  FROM auctions WHERE id = p_auction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'get_dealer_decline_history: auction % not found', p_auction_id;
  END IF;

  IF NOT is_group_member(v_group_id) THEN
    RAISE EXCEPTION 'get_dealer_decline_history: not authorized';
  END IF;

  IF v_seller_id <> auth.uid() AND NOT is_group_admin(v_group_id) THEN
    RAISE EXCEPTION 'get_dealer_decline_history: not authorized';
  END IF;

  RETURN QUERY
  SELECT wl.user_id, -wl.amount, wl.created_at
  FROM wallet_ledger wl
  WHERE wl.kind = 'dealer_decline_fee'
    AND wl.ref_table = 'auctions'
    AND wl.ref_id = p_auction_id
  ORDER BY wl.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_dealer_decline_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_dealer_decline_history(uuid) TO authenticated;

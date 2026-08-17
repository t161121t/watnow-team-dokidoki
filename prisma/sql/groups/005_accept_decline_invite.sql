-- docs/DB.md §4.3 accept_invite / decline_invite
-- 再参加時はwalletの既存行を balance=0 にリセットして再利用（ポイント非持ち越し）
--
-- 2026-08-18レビュー反映: balanceを直接0にUPDATEしていて wallet_ledger に記録が
-- 残らず「ledgerとbalanceが一致」という不変条件を壊していたため、
-- _credit_wallet/_debit_wallet(kind='admin_adjustment')経由でゼロ化するよう修正。
-- ヘルパーは expired_at IS NULL を要求するため、先にexpired_atを解除してから呼ぶ。

CREATE OR REPLACE FUNCTION accept_invite(p_group_id uuid)
RETURNS group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result group_members;
  v_existing_wallet wallets;
BEGIN
  UPDATE group_members
  SET status = 'active', joined_at = now()
  WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'invited'
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accept_invite: no pending invite for this group';
  END IF;

  SELECT * INTO v_existing_wallet
  FROM wallets WHERE group_id = p_group_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO wallets (group_id, user_id, balance, created_at, updated_at)
    VALUES (p_group_id, auth.uid(), 0, now(), now());
  ELSE
    UPDATE wallets SET expired_at = NULL, updated_at = now()
    WHERE group_id = p_group_id AND user_id = auth.uid();

    IF v_existing_wallet.balance > 0 THEN
      PERFORM _debit_wallet(p_group_id, auth.uid(), v_existing_wallet.balance, 'admin_adjustment', 'group_members', NULL, true);
    ELSIF v_existing_wallet.balance < 0 THEN
      PERFORM _credit_wallet(p_group_id, auth.uid(), -v_existing_wallet.balance, 'admin_adjustment', 'group_members', NULL);
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION decline_invite(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'invited';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'decline_invite: no pending invite for this group';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION accept_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_invite(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION decline_invite(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION decline_invite(uuid) TO authenticated;

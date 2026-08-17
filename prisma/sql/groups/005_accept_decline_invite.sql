-- docs/DB.md §4.3 accept_invite / decline_invite
-- 再参加時はwalletの既存行を balance=0 にリセットして再利用（ポイント非持ち越し）

CREATE OR REPLACE FUNCTION accept_invite(p_group_id uuid)
RETURNS group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result group_members;
  v_wallet_exists boolean;
BEGIN
  UPDATE group_members
  SET status = 'active', joined_at = now()
  WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'invited'
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'accept_invite: no pending invite for this group';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM wallets WHERE group_id = p_group_id AND user_id = auth.uid()
  ) INTO v_wallet_exists;

  IF v_wallet_exists THEN
    UPDATE wallets
    SET balance = 0, expired_at = NULL, updated_at = now()
    WHERE group_id = p_group_id AND user_id = auth.uid();
  ELSE
    INSERT INTO wallets (group_id, user_id, balance, created_at, updated_at)
    VALUES (p_group_id, auth.uid(), 0, now(), now());
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

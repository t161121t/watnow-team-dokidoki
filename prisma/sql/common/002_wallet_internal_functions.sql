-- docs/DB.md §6.5
-- 外部公開しない内部helper。他のSECURITY DEFINER関数（place_bid, finalize_auction等）から
-- のみ呼ばれる想定。authenticated/anon から直接叩けないようEXECUTEを剥奪する。
--
-- 2026-08-18 PRレビュー反映:
-- - amount=0 は許容してno-op（register_secretのasking_price=0、challengeのreward=0で
--   0円イベントが起きうるため。wallet_ledger.amount<>0の不変条件を守るため行自体を作らない）
-- - expired_at IS NULL を要求する（脱退/kickされたwalletは動かせない。
--   「脱退時にポイント失効」という仕様と衝突するのを防ぐ）

CREATE OR REPLACE FUNCTION _credit_wallet(
  p_group_id uuid,
  p_user_id uuid,
  p_amount int,
  p_kind wallet_tx_kind,
  p_ref_table text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL
) RETURNS wallet_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance int;
  v_ledger wallet_ledger;
BEGIN
  IF p_amount < 0 THEN
    RAISE EXCEPTION '_credit_wallet: amount must not be negative (got %)', p_amount;
  END IF;

  IF p_amount = 0 THEN
    RETURN NULL;
  END IF;

  UPDATE wallets
  SET balance = balance + p_amount, updated_at = now()
  WHERE group_id = p_group_id AND user_id = p_user_id AND expired_at IS NULL
  RETURNING balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION '_credit_wallet: wallet not found or expired for group % user %', p_group_id, p_user_id;
  END IF;

  INSERT INTO wallet_ledger (id, group_id, user_id, amount, balance_after, kind, ref_table, ref_id, created_by, created_at)
  VALUES (gen_random_uuid(), p_group_id, p_user_id, p_amount, v_new_balance, p_kind, p_ref_table, p_ref_id, auth.uid(), now())
  RETURNING * INTO v_ledger;

  RETURN v_ledger;
END;
$$;

CREATE OR REPLACE FUNCTION _debit_wallet(
  p_group_id uuid,
  p_user_id uuid,
  p_amount int,
  p_kind wallet_tx_kind,
  p_ref_table text DEFAULT NULL,
  p_ref_id uuid DEFAULT NULL,
  p_allow_negative boolean DEFAULT false
) RETURNS wallet_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance int;
  v_new_balance int;
  v_ledger wallet_ledger;
BEGIN
  IF p_amount < 0 THEN
    RAISE EXCEPTION '_debit_wallet: amount must not be negative (got %)', p_amount;
  END IF;

  IF p_amount = 0 THEN
    RETURN NULL;
  END IF;

  SELECT balance INTO v_current_balance
  FROM wallets
  WHERE group_id = p_group_id AND user_id = p_user_id AND expired_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION '_debit_wallet: wallet not found or expired for group % user %', p_group_id, p_user_id;
  END IF;

  IF NOT p_allow_negative AND v_current_balance < p_amount THEN
    RAISE EXCEPTION '_debit_wallet: insufficient balance (has %, needs %)', v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;

  UPDATE wallets
  SET balance = v_new_balance, updated_at = now()
  WHERE group_id = p_group_id AND user_id = p_user_id;

  INSERT INTO wallet_ledger (id, group_id, user_id, amount, balance_after, kind, ref_table, ref_id, created_by, created_at)
  VALUES (gen_random_uuid(), p_group_id, p_user_id, -p_amount, v_new_balance, p_kind, p_ref_table, p_ref_id, auth.uid(), now())
  RETURNING * INTO v_ledger;

  RETURN v_ledger;
END;
$$;

REVOKE EXECUTE ON FUNCTION _credit_wallet(uuid, uuid, int, wallet_tx_kind, text, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION _debit_wallet(uuid, uuid, int, wallet_tx_kind, text, uuid, boolean) FROM PUBLIC;

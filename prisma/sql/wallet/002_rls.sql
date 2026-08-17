-- docs/DB.md §4.6, §4.7, §7.2
-- wallets/wallet_ledgerは「本人のみselect可」。insert/update/deleteのポリシーは
-- 一切定義しない（＝authenticatedからは直接書き込み不可。RPC(SECURITY DEFINER)経由のみ）。

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_select_own ON wallets;
CREATE POLICY wallets_select_own ON wallets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

ALTER TABLE wallet_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallet_ledger_select_own ON wallet_ledger;
CREATE POLICY wallet_ledger_select_own ON wallet_ledger
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

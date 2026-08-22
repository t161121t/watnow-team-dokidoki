-- authenticated ロールへの基本テーブル権限。
-- RLSを有効にしていても、テーブル自体へのGRANTが無いと「permission denied」に
-- なる（RLSより先にテーブル権限チェックが働くため）。
--
-- 書き込み（INSERT/UPDATE/DELETE）は基本的に付与しない。全て RPC(SECURITY DEFINER、
-- テーブル所有者権限で実行されるためGRANT不要)経由にする設計（lib/README.md、
-- docs/アーキテクチャ.md参照）。
--
-- 例外: users（本人プロフィール編集）と groups（admin によるグループ名/アイコン編集）は
-- 危険度が低く、docs/DB.md のRLS方針でも直接UPDATEを許容しているため、RLSポリシーに
-- 対応するUPDATEのみ付与する。

GRANT SELECT ON
  users, groups, group_members, group_invite_links, wallets, wallet_ledger,
  secrets, secret_group_items, auctions, bids, challenges, challenge_attempts
TO authenticated;

GRANT UPDATE ON users TO authenticated;
GRANT UPDATE ON groups TO authenticated;

# features/wallet

グループごとのポイント（財布）の**読み取り**を置く。書き込みは無い。

- `server/get-balance.ts`: 残高。アーキテクチャのサンプル実装（`docs/アーキテクチャ.md` §4）
- `server/get-wallet-ledger-history.ts`: 増減履歴（ページネーション付き）
- `server/get-dealer-decline-history.ts`: ディーラー辞退履歴（`get_dealer_decline_history` RPC）
- `components/wallet-balance.tsx`: 残高表示

ポイントの増減は、入札・落札確定・チャレンジ承認など**他ドメインの RPC の中**で `_credit_wallet` / `_debit_wallet`（`prisma/sql/common/002_wallet_internal_functions.sql`）を呼んで行う。クライアントからは直接増減できない（`docs/DB.md` §1.2）。グループ間の移動・合算は作らない。

検証: `npm run verify:wallet`

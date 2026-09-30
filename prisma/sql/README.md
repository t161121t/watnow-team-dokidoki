# prisma/sql/

PostgreSQL Functions（RPC）・RLS ポリシー・trigger など、Prisma のスキーマ言語（`schema.prisma`）では書けない DB オブジェクトを置く場所。

## 何を書く

- `CREATE OR REPLACE FUNCTION ...`（`SECURITY DEFINER` の RPC。例: `place_bid`, `finalize_auction`）
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` / `CREATE POLICY ...`
- `CREATE TRIGGER ...`

## 何を書かない

- テーブル・カラム・enum・インデックスの定義（`prisma/schema.prisma` 側。`prisma migrate dev` で管理）
- seed データ投入用の大量 INSERT（`prisma/seed.ts` 等、別途用意する）

## 適用方法

```bash
npx prisma migrate deploy   # schema.prisma 由来のテーブル定義を適用
npm run db:sql              # prisma/sql/**/*.sql を適用（common/ を最優先、他はドメイン名の辞書順。ファイルはドメイン内で辞書順）
```

`common/` は他ドメインのRLS/RPCが参照する共通ヘルパー（`is_group_member()`等）を持つため、辞書順に関係なく必ず最初に適用される（`scripts/apply-sql.ts` の `PRIORITY_DOMAINS` 参照）。

`npm run db:setup` はこの両方を実行する（`scripts/apply-sql.ts` 参照）。

## ルール

- 1 ファイル = 1 オブジェクト目安（`place_bid.sql`, `wallets_rls.sql` など）。巨大な1ファイルに詰め込まない
- 何度実行しても壊れないように書く（`CREATE OR REPLACE FUNCTION`、`DROP POLICY IF EXISTS` → `CREATE POLICY`）
- ドメインフォルダ（`auth/` `groups/` `secrets/` `auctions/` `wallet/` `challenges/`）は `features/<domain>/` と対応させる。どのドメインにも属さない共通ヘルパー（例: `is_group_member()`）は `common/` を作って置く

## ファイル番号の欠番

ファイル名の番号は適用順の目安で、連番である必要はない。次の欠番は意図したもの:

| 欠番 | 理由 |
| --- | --- |
| `groups/004`・`groups/005` | 旧・直接招待方式（`invite_member` / `accept_invite` / `decline_invite`）のファイル。2026-08-22 の URL 招待方式への変更（issue #71）で削除した。番号は詰めず、`006_membership_lifecycle.sql` の名前を維持している |
| `wallet/001` | 最初から存在しない。wallet の内部関数（`_credit_wallet` / `_debit_wallet`）は他ドメインからも使うため `common/002_wallet_internal_functions.sql` に置いた |

番号を詰めるための改名はしない（ファイル名を参照する docs・コメントが壊れるため）。


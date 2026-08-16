# DB 設計 — 秘密オークション（仮）

ステータス: 設計ドラフト v2（P1–P12・DB-3/4/6/7 確定を反映。2026-08-17）  
作成日: 2026-08-16  
更新日: 2026-08-17  
対象: Supabase PostgreSQL / Auth / Realtime / Storage  

v2 での主な変更点:

- P1 確定に伴い、オークション開始を「固定待機時間」から「ディーラー承認によるイベント駆動」に変更（§3 `auction_status`、§4.10、§6.2、§6.3、§10 を変更）
- P9 確定（ディーラーへの入札者開示）に伴い、`seller_bid_view` をディーラーも見られるよう変更（§5.2）
- DB-4 確定（AI validation は MVP 対象外）に伴い、`validation_status` 関連カラム・enum を削除（§3、§4.9、§15）
- DB-6 / DB-7 確定（残高公開・コメント/リアクションは作らない）を §15 に明記
- P2–P7・P11・P12 の確定値を `group_auction_settings` の既定値・各種計算ロジックに反映

---

## 0. 文書の位置づけ

本ファイルは、既存 docs の PRD / TRD / 機能要件 / オークションルールを DB 設計へ落とし込むための設計メモ。

仕様の優先順位は `PRD.md` / `TRD.md` に従う。

1. `PRD.md` の確定方針
2. `オークションルール.md` のオークション詳細
3. `TRD.md` の技術方針
4. `機能要件.md` / `画面.md` / `ユーザーフロー .md` の詳細案

特に本設計では次を確定前提として扱う。

- ポイント・秘密・オークションは **グループ完全分離**
- ショップは廃止し、秘密の獲得はオークションのみ
- 入札はエスクローなし。負けた入札者のポイントは消費・拘束しない
- 入札は残高内のみ。入札によって借金を増やさない
- マイナス残高は許可する
- 出品者の自出品への入札は不可
- 秘密本文は、出品者本人と落札閲覧権を持つユーザー以外に出さない

---

## 1. 設計原則

### 1.1 グループ完全分離

全てのグループスコープデータには `group_id` を持たせる。

対象:

- `group_members`
- `wallets`
- `wallet_ledger`
- `secret_group_items`
- `auctions`
- `bids`
- `secret_accesses`
- `challenges`
- `challenge_attempts`
- `challenge_approvals`

RLS と PostgreSQL Function の冒頭チェックで二重防御する。

### 1.2 危険な更新は RPC 経由

クライアントから直接更新させないもの:

- wallet 残高
- wallet 履歴
- 入札
- オークション確定
- 落札閲覧権
- チャレンジ承認後のポイント付与
- ディーラー辞退料

これらは `SECURITY DEFINER` の PostgreSQL Function で同一トランザクション内に閉じる。

### 1.3 秘密本文とグループ内出品を分離

`secrets` は本人が登録した秘密本文を持つ。  
`secret_group_items` は、その秘密が特定グループでどう扱われるかを持つ。

MVP では選択中グループに 1 件だけ作ればよい。Phase 2 の「同一秘密を複数グループへ公開」にも、`secret_group_items` をグループごとに増やせば対応できる。

---



## 2. 論理 ER

```text
auth.users
  1 ─ 1 users
  1 ─ * group_members * ─ 1 groups
  1 ─ * wallets       * ─ 1 groups

users
  1 ─ * secrets

secrets
  1 ─ * secret_group_items * ─ 1 groups
                         1 ─ * auctions

auctions
  1 ─ * bids
  1 ─ * secret_accesses
  1 ─ * dealer_declines

groups
  1 ─ * challenges
  1 ─ * challenge_attempts

challenge_attempts
  1 ─ * challenge_approvals

wallets
  1 ─ * wallet_ledger
```

---



## 3. Enum / 型

実装時は PostgreSQL enum か check constraint で定義する。


| 型                    | 値                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `member_role`        | `member`, `admin`                                                                                                                                                    |
| `member_status`      | `active`, `left`, `kicked`                                                                                                                                           |
| `secret_item_status` | `registered`, `listed`, `on_auction`, `sold`, `returned`, `withdrawn`                                                                                                |
| `auction_status`     | `pending_dealer_approval`, `open`, `finalizing`, `sold`, `no_sale`, `canceled`                                                                                       |
| `bid_status`         | `valid`, `superseded`, `winning`, `canceled`, `failed`                                                                                                               |
| `wallet_tx_kind`     | `challenge_reward`, `listing_prepay`, `listing_reclaim`, `winning_bid_debit`, `seller_share_credit`, `dealer_share_credit`, `dealer_decline_fee`, `admin_adjustment` |
| `challenge_status`   | `active`, `archived`                                                                                                                                                 |
| `attempt_status`     | `pending`, `approved`, `rejected`, `awarded`, `canceled`                                                                                                             |
| `approval_decision`  | `approved`, `rejected`                                                                                                                                               |

`validation_status`（AI validation 用）は DB-4 確定（MVP 対象外）により削除。Phase 2 で AI validation を実装する際に再定義する（§15 参照）。

`auction_status` 補足（P1 確定に伴う変更）:

- `scheduled` を廃止し `pending_dealer_approval` に変更。固定の開始時刻を待つのではなく、ランダム選抜されたディーラーの承認を待つ状態を表す
- `pending_dealer_approval` → `open`: ディーラー承認時（`approve_dealer_assignment` RPC、§6.3）
- `pending_dealer_approval` のまま: ディーラー辞退時は同じ auction 行の `dealer_id` を再割当し、`pending_dealer_approval` を維持する（§4.13、§6.3）


---



## 4. テーブル設計



### 4.1 `users`（旧 `profiles`。2026-08-17 リネーム）

Supabase Auth のユーザーに紐づく表示用プロフィール。`public.users` として作成する（Supabase 標準の `auth.users` とはスキーマが異なる別テーブル。`id` で 1:1 対応）。


| カラム           | 型             | 制約 / 用途               |
| ------------- | ------------- | --------------------- |
| `id`          | `uuid`        | PK。`auth.users.id`    |
| `nickname`    | `text`        | not null              |
| `avatar_path` | `text`        | Storage path。nullable |
| `created_at`  | `timestamptz` | not null              |
| `updated_at`  | `timestamptz` | not null              |


RLS:

- 本人は select / update 可
- 同じグループ所属者の表示名・アイコンは select 可
- 他グループだけのユーザー情報は直接見せない

---



### 4.2 `groups`

友達グループ本体。


| カラム           | 型             | 制約 / 用途          |
| ------------- | ------------- | ---------------- |
| `id`          | `uuid`        | PK               |
| `name`        | `text`        | not null         |
| `icon_path`   | `text`        | nullable         |
| `created_by`  | `uuid`        | FK `users.id` |
| `created_at`  | `timestamptz` | not null         |
| `updated_at`  | `timestamptz` | not null         |
| `archived_at` | `timestamptz` | nullable         |


RLS:

- active member のみ select 可
- insert は RPC `create_group` 経由
- update は admin のみ

---



### 4.3 `group_members`

ユーザーの所属・権限。


| カラム         | 型               | 制約 / 用途                    |
| ----------- | --------------- | -------------------------- |
| `group_id`  | `uuid`          | PK part / FK `groups.id`   |
| `user_id`   | `uuid`          | PK part / FK `users.id` |
| `role`      | `member_role`   | not null                   |
| `status`    | `member_status` | not null default `active`  |
| `joined_at` | `timestamptz`   | not null                   |
| `left_at`   | `timestamptz`   | nullable                   |


制約:

- unique `(group_id, user_id)`
- active admin が最低 1 人残ることは check constraint ではなく RPC で保証する

RLS:

- 同じグループの active member は member 一覧を select 可
- role / status の変更は admin RPC 経由
- 自分の脱退は `leave_group` RPC 経由

---



### 4.4 `group_invites`

招待コード / 招待リンク。


| カラム          | 型             | 制約 / 用途            |
| ------------ | ------------- | ------------------ |
| `id`         | `uuid`        | PK                 |
| `group_id`   | `uuid`        | FK `groups.id`     |
| `code_hash`  | `text`        | unique。平文コードは保存しない |
| `created_by` | `uuid`        | FK `users.id`   |
| `expires_at` | `timestamptz` | nullable           |
| `max_uses`   | `int`         | nullable           |
| `used_count` | `int`         | not null default 0 |
| `revoked_at` | `timestamptz` | nullable           |
| `created_at` | `timestamptz` | not null           |


RLS:

- admin は自グループ invite を select / revoke 可
- 参加処理は `join_group` RPC で code を検証する

---



### 4.5 `group_auction_settings`

P1–P12（2026-08-17 確定）の実値の置き場。グループ作成時に既定値で 1 行作成し、幹事が変更できるものは変更を許可する。P1 はイベント駆動になったため `listing_wait_seconds` は廃止（§3 `auction_status` 参照）。


| カラム                         | 型             | 対応 / 既定値                       |
| --------------------------- | ------------- | ------------------------------- |
| `group_id`                  | `uuid`        | PK / FK `groups.id`             |
| `auction_open_seconds`      | `int`         | P2。既定 `86400`（24時間）。幹事が変更可      |
| `start_price_add`           | `int`         | P3。固定 `0`                       |
| `start_price_multiplier`    | `numeric`     | P3。固定 `1`                       |
| `listing_prepay_rate`       | `numeric`     | P4。固定 `1.0`（100%）               |
| `listing_prepay_fixed`      | `int`         | P4。固定 `0`                       |
| `seller_bonus_rate`         | `numeric`     | P5。固定 `0`（追加振込なし）               |
| `no_sale_depreciation_rate` | `numeric`     | P6。固定 `0.20`                    |
| `dealer_share_rate`         | `numeric`     | P7。固定 `0.30`                    |
| `seller_share_rate`         | `numeric`     | P7。固定 `0.70`                    |
| `dealer_can_see_bidders`    | `boolean`     | P9。固定 `true`                    |
| `min_balance_limit`         | `int`         | P11。`null`（上限なし。この仕様で固定）        |
| `dealer_decline_fee_fixed`  | `int`         | P12。固定 `0`                      |
| `dealer_decline_fee_rate`   | `numeric`     | P12。固定 `0.05`（出品価格の5%、完全没収）     |
| `updated_by`                | `uuid`        | FK `users.id`                |
| `updated_at`                | `timestamptz` | not null                        |


補足:

- P8 は PRD で「自出品への入札不可」が確定しているため設定化しない
- 「固定」と記載した値も本テーブルのカラムとして持つ（将来グループごとに変えたくなった場合の変更コストを抑えるため）。ただし MVP の UI では `auction_open_seconds` 以外は編集不可にする
- `dealer_share_rate + seller_share_rate = 1` を check constraint で保証する
- `min_balance_limit` が `null` の場合、`place_bid` は残高不足チェック（`balance >= amount`）のみ行い、確定済みの借金には上限を課さない

---



### 4.6 `wallets`

グループ内の個人財布。ポイントはグループ横断で合算しない。


| カラム          | 型             | 制約 / 用途                    |
| ------------ | ------------- | -------------------------- |
| `group_id`   | `uuid`        | PK part / FK `groups.id`   |
| `user_id`    | `uuid`        | PK part / FK `users.id` |
| `balance`    | `int`         | not null。マイナス可             |
| `created_at` | `timestamptz` | not null                   |
| `updated_at` | `timestamptz` | not null                   |
| `expired_at` | `timestamptz` | グループ脱退時に失効                 |


制約:

- unique `(group_id, user_id)`
- active member に対して 1 件作成
- 残高の直接 update は禁止

RLS:

- 本人は自分の wallet を select 可
- admin / 他メンバーへの残高開示は、画面要件が決まるまでは直接 select させない
- insert / update / delete は RPC のみ

---



### 4.7 `wallet_ledger`

ポイント増減履歴。残高の監査ログ。


| カラム             | 型                | 制約 / 用途                 |
| --------------- | ---------------- | ----------------------- |
| `id`            | `uuid`           | PK                      |
| `group_id`      | `uuid`           | FK `groups.id`          |
| `user_id`       | `uuid`           | FK `users.id`        |
| `amount`        | `int`            | not null。増加は正、減少は負      |
| `balance_after` | `int`            | not null                |
| `kind`          | `wallet_tx_kind` | not null                |
| `ref_table`     | `text`           | 参照元テーブル名                |
| `ref_id`        | `uuid`           | 参照元 id                  |
| `created_by`    | `uuid`           | 実行ユーザー。cron 等は nullable |
| `created_at`    | `timestamptz`    | not null                |


制約:

- `amount <> 0`
- append only。update / delete 禁止

RLS:

- 本人は自分の履歴を select 可
- グループ完全分離。別グループ履歴は不可
- insert は wallet 操作用 RPC のみ

---



### 4.8 `secrets`

秘密本文そのもの。グループ公開状態は持たない。


| カラム          | 型             | 制約 / 用途                                    |
| ------------ | ------------- | ------------------------------------------ |
| `id`         | `uuid`        | PK                                         |
| `owner_id`   | `uuid`        | FK `users.id`                           |
| `body`       | `text`        | 秘密本文。落札まで秘匿                                |
| `summary`    | `text`        | ディーラー・一覧用の概要。本文を直接含めすぎない                   |
| `category`   | `text`        | 恋愛 / 黒歴史 / 趣味 / 特技など。初期は text、安定後 lookup 化 |
| `rarity`     | `smallint`    | 自己申告。例: 1-5                                |
| `created_at` | `timestamptz` | not null                                   |
| `updated_at` | `timestamptz` | not null                                   |
| `deleted_at` | `timestamptz` | 出品前削除用 soft delete                         |


制約:

- `rarity between 1 and 5`
- 出品済み / 落札済みの本文改変は禁止。RPC で状態を確認する

RLS:

- owner は select / insert / update / delete 可。ただし出品前のみ更新・削除可
- 落札者は `secret_accesses` 経由の read view から本文閲覧可
- 直接 `secrets` をグループメンバー全員に公開しない

---



### 4.9 `secret_group_items`

秘密が特定グループ内でどの状態にあるかを表す。在庫・出品前ステータス。


| カラム                 | 型                    | 制約 / 用途                                 |
| ------------------- | -------------------- | --------------------------------------- |
| `id`                | `uuid`               | PK                                      |
| `secret_id`         | `uuid`               | FK `secrets.id`                         |
| `group_id`          | `uuid`               | FK `groups.id`                          |
| `seller_id`         | `uuid`               | FK `users.id`。基本は `secrets.owner_id` |
| `status`            | `secret_item_status` | not null                                |
| `asking_price`      | `int`                | 出品者の自己設定価格                              |
| `current_value`     | `int`                | 不落札目減り後の価値                              |
| `created_at`        | `timestamptz`        | not null                                |
| `updated_at`        | `timestamptz`        | not null                                |

DB-4 確定（AI validation は MVP 対象外）のため `validation_status` / `validation_note` は持たない。Phase 2 で AI validation を実装する際にカラム追加のマイグレーションを行う。

制約:

- unique `(secret_id, group_id)`
- `asking_price >= 0`
- `current_value >= 0`
- `seller_id` は active group member

RLS:

- group member は本文を含まない metadata を select 可
- seller は自分の item を管理可。ただし listed 以降の変更は RPC で制限
- insert は `register_secret` / `publish_secret_to_group` RPC 経由

---



### 4.10 `auctions`

出品実施から競り終了までを表す。1 つの `secret_group_items` は、返却後の再出品により複数 auction を持ち得る。

P1 確定（ディーラー承認によるイベント駆動）により、`starts_at` / `ends_at` は**行作成時点では未確定**（承認されるまで auction は開始しないため）。承認時に `approve_dealer_assignment` RPC が確定させる（§6.3、§10）。


| カラム                           | 型                | 制約 / 用途                                             |
| ----------------------------- | ---------------- | ---------------------------------------------------- |
| `id`                          | `uuid`           | PK                                                    |
| `group_id`                    | `uuid`           | FK `groups.id`                                        |
| `secret_group_item_id`        | `uuid`           | FK `secret_group_items.id`                            |
| `seller_id`                   | `uuid`           | FK `users.id`                                      |
| `dealer_id`                   | `uuid`           | FK `users.id`。辞退のたびに再割当で更新される（履歴は `dealer_declines`） |
| `status`                      | `auction_status` | not null。既定 `pending_dealer_approval`                 |
| `starting_price`              | `int`            | not null                                              |
| `current_price`               | `int`            | not null                                              |
| `dealer_approved_at`          | `timestamptz`    | nullable。承認時刻                                        |
| `starts_at`                   | `timestamptz`    | nullable。承認時に確定（`= dealer_approved_at`）                |
| `ends_at`                     | `timestamptz`    | nullable。承認時に確定（`= starts_at + auction_open_seconds`） |
| `winner_id`                   | `uuid`           | nullable                                              |
| `winning_bid_id`              | `uuid`           | nullable                                              |
| `final_price`                 | `int`            | nullable                                              |
| `listing_prepay_amount`       | `int`            | P4 の実値（= `starting_price`。出品確定時に確定）                    |
| `seller_share_amount`         | `int`            | 確定時に保存                                                |
| `dealer_share_amount`         | `int`            | 確定時に保存                                                |
| `no_sale_depreciation_amount` | `int`            | 不落札時に保存                                               |
| `created_at`                  | `timestamptz`    | not null                                              |
| `updated_at`                  | `timestamptz`    | not null                                              |
| `finalized_at`                | `timestamptz`    | nullable                                              |


制約:

- `seller_id <> dealer_id`
- `starts_at < ends_at`（両方 not null の場合のみ。`pending_dealer_approval` の間は両方 null）
- `status = 'pending_dealer_approval'` の間は `starts_at` / `ends_at` は null、`open` 以降は両方 not null（check constraint）
- `starting_price >= 0`
- `current_price >= starting_price`
- `dealer_id` は同 group の active member

`dealer_id` / `seller_id` は当該 auction に入札できない。これは `auctions` 単体の check constraint では表現できないため（`bids` 側の行を見る必要がある）、`place_bid` RPC 側で保証する。詳細は §4.11 の制約を参照。

RLS:

- group member は一覧・詳細 metadata を select 可
- 本文は見せない
- seller / dealer は自分が関与する auction の入札者識別情報を `bidder_identified_view` 経由で見られる（P9 確定）
- dealer は本文を見られず、概要のみ見られる
- insert / update は RPC のみ

---



### 4.11 `bids`

入札履歴。エスクローはしないため、insert 時点では wallet を減らさない。


| カラム          | 型             | 制約 / 用途                  |
| ------------ | ------------- | ------------------------ |
| `id`         | `uuid`        | PK                       |
| `group_id`   | `uuid`        | FK `groups.id`           |
| `auction_id` | `uuid`        | FK `auctions.id`         |
| `bidder_id`  | `uuid`        | FK `users.id`         |
| `amount`     | `int`         | not null                 |
| `status`     | `bid_status`  | not null default `valid` |
| `created_at` | `timestamptz` | not null                 |


制約:

- `amount > 0`
- `bidder_id` は active group member
- `bidder_id <> auctions.seller_id`
- `bidder_id <> auctions.dealer_id`
- `amount > auctions.current_price`
- `wallets.balance >= amount` を `place_bid` RPC 内で確認

直接 CHECK では他テーブル参照できないため、入札制約は `place_bid` RPC と transaction lock で保証する。

`status` の遷移補足:

- `winning`: `finalize_auction` で最終的に落札が決まった bid
- `failed`: 確定時点で bidder の残高が不足しており、次点へ繰り上げるために無効化された bid（§10.2.1 参照）。入札自体は有効だったが決済できなかったことを示す
- それ以外の `valid` な bid は `finalize_auction` 後もそのまま `valid` で残る（`winning` にも `failed` にもならない、落札に絡まなかった入札）

RLS:

- direct insert は禁止。`place_bid` RPC のみ
- bidder は自分の bid を select 可
- seller / dealer は自分が関与する auction の bid を bidder 識別付きで select 可（P9 確定。`bidder_identified_view`、§5.2）
- その他 group member（出品者・ディーラー以外）は匿名化 view のみ（`anonymous_bid_feed_view`、§5.3）

---



### 4.12 `secret_accesses`

落札後の閲覧権。コレクション表示の正本。


| カラム                    | 型             | 制約 / 用途                    |
| ---------------------- | ------------- | -------------------------- |
| `id`                   | `uuid`        | PK                         |
| `group_id`             | `uuid`        | FK `groups.id`             |
| `secret_id`            | `uuid`        | FK `secrets.id`            |
| `secret_group_item_id` | `uuid`        | FK `secret_group_items.id` |
| `auction_id`           | `uuid`        | FK `auctions.id`           |
| `user_id`              | `uuid`        | FK `users.id`           |
| `granted_at`           | `timestamptz` | not null                   |


制約:

- unique `(auction_id, user_id)`
- winner にのみ作成
- owner 本人の閲覧は `secrets.owner_id` で認めるため、owner 用 access 行は不要

RLS:

- user は自分の access を select 可
- 本文閲覧は `my_secret_collection_view` / RPC で `secret_accesses` を確認して返す

---



### 4.13 `dealer_declines`

ディーラー辞退履歴。P12 確定（出品価格の 5%・完全没収・開始前のみ辞退可）に伴い実値が決まった。`decline_dealer` は `auctions.status = 'pending_dealer_approval'` の場合のみ許可し、`open` 以降は拒否する。


| カラム                | 型             | 制約 / 用途                                    |
| ------------------ | ------------- | ------------------------------------------- |
| `id`               | `uuid`        | PK                                           |
| `group_id`         | `uuid`        | FK `groups.id`                               |
| `auction_id`       | `uuid`        | FK `auctions.id`                             |
| `dealer_id`        | `uuid`        | FK `users.id`                             |
| `fee_amount`       | `int`         | 辞退料。`secret_group_items.asking_price * 0.05` |
| `wallet_ledger_id` | `uuid`        | FK `wallet_ledger.id`                        |
| `created_at`       | `timestamptz` | not null                                     |


辞退料はグループへの還元やプールを行わず、`wallet_ledger` 上は `dealer_decline_fee` として debit するのみ（完全没収。credit 側の行は作らない）。再割当の回数上限はなし。

RLS:

- auction 関係者と admin は select 可
- insert は `decline_dealer` RPC のみ

---



### 4.14 `challenges`

ミニゲーム / チャレンジの定義。システム提供内容は未定のため、まずは汎用的な器にする。


| カラム                       | 型                  | 制約 / 用途                          |
| ------------------------- | ------------------ | -------------------------------- |
| `id`                      | `uuid`             | PK                               |
| `group_id`                | `uuid`             | nullable。null は system challenge |
| `created_by`              | `uuid`             | nullable。group 独自なら admin        |
| `title`                   | `text`             | not null                         |
| `description`             | `text`             | nullable                         |
| `reward_points`           | `int`              | not null                         |
| `requires_evidence_photo` | `boolean`          | default false                    |
| `required_approvals`      | `int`              | not null default 1               |
| `cooldown_seconds`        | `int`              | nullable                         |
| `status`                  | `challenge_status` | not null                         |
| `created_at`              | `timestamptz`      | not null                         |
| `updated_at`              | `timestamptz`      | not null                         |


制約:

- `reward_points >= 0`
- `required_approvals >= 1`
- 自己承認不可は approvals 側と RPC で保証

RLS:

- system challenge と所属 group challenge を select 可
- group challenge の作成・編集は admin RPC 経由

---



### 4.15 `challenge_attempts`

チャレンジ挑戦履歴。ポイント付与先 group を必ず持つ。


| カラム                 | 型                | 制約 / 用途               |
| ------------------- | ---------------- | --------------------- |
| `id`                | `uuid`           | PK                    |
| `group_id`          | `uuid`           | FK `groups.id`        |
| `challenge_id`      | `uuid`           | FK `challenges.id`    |
| `user_id`           | `uuid`           | FK `users.id`      |
| `status`            | `attempt_status` | not null              |
| `evidence_path`     | `text`           | Storage path          |
| `reward_points`     | `int`            | 承認時点の実値を保存            |
| `awarded_ledger_id` | `uuid`           | FK `wallet_ledger.id` |
| `created_at`        | `timestamptz`    | not null              |
| `updated_at`        | `timestamptz`    | not null              |
| `awarded_at`        | `timestamptz`    | nullable              |


制約:

- `user_id` は active group member
- cooldown / 獲得上限は `submit_challenge` RPC で確認

RLS:

- group member は同 group の attempt 進捗を select 可
- insert / status update は RPC のみ

---



### 4.16 `challenge_approvals`

複数人承認の記録。　


| カラム           | 型                   | 制約 / 用途                              |
| ------------- | ------------------- | ------------------------------------ |
| `attempt_id`  | `uuid`              | PK part / FK `challenge_attempts.id` |
| `approver_id` | `uuid`              | PK part / FK `users.id`           |
| `decision`    | `approval_decision` | not null                             |
| `created_at`  | `timestamptz`       | not null                             |


制約:

- unique `(attempt_id, approver_id)`
- `approver_id <> challenge_attempts.user_id`
- `approver_id` は同 group の active member

RLS:

- group member は同 group の approvals を select 可
- insert は `approve_challenge` RPC のみ

---



### 4.17 `storage_objects_meta`

Supabase Storage 自体は `storage.objects` を使う。アプリ側で参照しやすい metadata が必要になった場合のみ追加する。

用途:

- profile avatar
- group icon
- challenge evidence photo

Storage bucket 案:


| bucket               | 用途                | 公開                    |
| -------------------- | ----------------- | --------------------- |
| `avatars`            | user / group icon | public または signed URL |
| `challenge-evidence` | チャレンジ写真           | private               |


---



## 5. View 設計



### 5.1 `auction_public_view`

グループメンバー向けのオークション一覧・詳細。

含める:

- `auction_id`
- `group_id`
- `secret_group_item_id`
- `seller_id`
- `dealer_id`
- `category`
- `rarity`
- `summary`
- `status`
- `current_price`
- `starts_at`
- `ends_at`
- `bid_count`

含めない:

- 秘密本文
- 入札者 ID



### 5.2 `bidder_identified_view`（旧 `seller_bid_view`。P9 確定によりディーラーも対象に）

出品者・ディーラー向け。自分が関与する auction の入札者を識別可能にする。

含める:

- `auction_id`
- `bid_id`
- `bidder_id`
- `bidder_nickname`
- `amount`
- `created_at`

RLS / view 条件:

- `auctions.seller_id = auth.uid()` **または** `auctions.dealer_id = auth.uid()`



### 5.3 `anonymous_bid_feed_view`

出品者・ディーラー以外の参加者向け。

含める:

- `auction_id`
- `amount`
- `created_at`
- `rank`

含めない:

- `bidder_id`
- `bidder_nickname`



### 5.4 `my_secret_collection_view`

落札済み秘密のコレクション。

含める:

- `group_id`
- `auction_id`
- `secret_id`
- `category`
- `rarity`
- `summary`
- `body`
- `seller_id`
- `granted_at`

条件:

- `secret_accesses.user_id = auth.uid()`
- または `secrets.owner_id = auth.uid()` の本人閲覧

---



## 6. RPC 設計



### 6.1 アカウント / グループ


| RPC                                                 | 責務                                                     |
| --------------------------------------------------- | ------------------------------------------------------ |
| `create_group(name, icon_path)`                     | group 作成、作成者を admin member にする、wallet 初期化、settings 初期化 |
| `join_group(invite_code)`                           | invite 検証、member 追加、wallet 初期化                         |
| `leave_group(group_id)`                             | member status を left、wallet を expired。最後の admin なら拒否   |
| `update_group_member_role(group_id, user_id, role)` | admin 権限付与 / 剥奪。最後の admin 剥奪は拒否                        |
| `kick_group_member(group_id, user_id)`              | admin による kick。wallet 失効                               |




### 6.2 秘密 / 出品


| RPC                                                                        | 責務                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------- |
| `register_secret(group_id, body, summary, category, rarity, asking_price)` | secrets と secret_group_items を作成。MVP は選択中 group のみ |
| `update_secret_before_listing(secret_id, ...)`                             | 出品前のみ編集                                            |
| `delete_secret_before_listing(secret_id)`                                  | 出品前のみ soft delete                                  |
| `publish_secret_to_group(secret_id, group_id, asking_price)`               | Phase 2 の複数 group 公開用                              |
| `list_secret_for_auction(secret_group_item_id)`                            | listed 化、`auctions` 行作成（`status = pending_dealer_approval`、`starts_at`/`ends_at` は null）、dealer ランダム選抜、前払い credit（P4） |




### 6.3 オークション / 入札


| RPC                                        | 責務                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `approve_dealer_assignment(auction_id)`     | 割り当てられた dealer 本人のみ実行可。`pending_dealer_approval` → `open`。`starts_at = now()`、`ends_at = now() + group_auction_settings.auction_open_seconds` を確定（P1・P2） |
| `place_bid(auction_id, amount)`             | 所属・状態（`open`）・残高・価格・自出品不可・dealer 不可を検証し bid 作成、current_price 更新                                                    |
| `claim_auction_for_finalize(auction_id)`    | `open` かつ `ends_at <= now()` の auction を `finalizing` にクレーム（Stage A。§10.2 参照）                                |
| `finalize_auction(auction_id)`              | `finalizing` の auction を確定。入札額降順に残高十分な候補を探索し勝者決定（次点繰り上げ、§10.2.1）。勝者 debit、按分 credit（P7）、閲覧権付与、status 更新（Stage B） |
| `finalize_due_auctions()`                   | cron 用。`claim_auction_for_finalize` → `finalize_auction` を終了済み open auction にまとめて適用                          |
| `decline_dealer(auction_id)`                | 割り当てられた dealer 本人のみ、`status = pending_dealer_approval` の間だけ実行可。辞退料（出品価格の5%）debit、dealer_declines 追加、dealer 再選抜（P12）。`status` は `pending_dealer_approval` のまま |

`open_due_auctions()` は P1 の仕様変更（固定待機時間の廃止）により不要になったため削除した。オークション開始はディーラーの `approve_dealer_assignment` 呼び出しのみで起こり、タイムアウト監視の cron は設けない（P1 確定：タイムアウトなし）。


`claim_auction_for_finalize` の必須 lock:

- 対象 `auctions` 行を `status = 'open' AND ends_at <= now()` 条件で `FOR UPDATE`
- 条件を満たさなければ何もせず終了（cron の重複起動に対する排他はこのクレームで担保する）

`finalize_auction` の必須 lock:

- 対象 `auctions` 行を `status = 'finalizing'` 条件で `FOR UPDATE`（満たさなければ二重実行として中断）
- 候補 bidder の `wallets` 行を、bid 金額降順で 1 候補ずつ `FOR UPDATE`
- winner が決まった時点で seller / dealer の `wallets` 行も `FOR UPDATE`
- 複数 auction を並行して確定する場合に備え、wallet のロック順序は `user_id` 昇順など一定の順序に固定し、デッドロックを避ける



### 6.4 チャレンジ / ポイント付与


| RPC                                                       | 責務                                 |
| --------------------------------------------------------- | ---------------------------------- |
| `submit_challenge(group_id, challenge_id, evidence_path)` | 所属・cooldown・上限を確認して attempt 作成     |
| `approve_challenge(attempt_id, decision)`                 | 自己承認不可、承認数集計、必要数到達時に wallet credit |
| `create_group_challenge(group_id, ...)`                   | admin による group 独自 challenge 作成    |




### 6.5 wallet 内部関数

外部公開しない内部 helper。


| Function                                                                            | 責務                   |
| ----------------------------------------------------------------------------------- | -------------------- |
| `_credit_wallet(group_id, user_id, amount, kind, ref_table, ref_id)`                | wallet 加算と ledger 追加 |
| `_debit_wallet(group_id, user_id, amount, kind, ref_table, ref_id, allow_negative)` | wallet 減算と ledger 追加 |


入札時は `_debit_wallet` を呼ばない。落札確定時だけ winner を debit する。

---



## 7. RLS 方針



### 7.1 共通 helper

実装時に SQL helper を用意する。

```sql
is_group_member(target_group_id uuid) returns boolean
is_group_admin(target_group_id uuid) returns boolean
```

条件:

- `group_members.group_id = target_group_id`
- `group_members.user_id = auth.uid()`
- `group_members.status = 'active'`



### 7.2 テーブル別ポリシー概要


| テーブル                  | select                      | insert / update / delete |
| --------------------- | --------------------------- | ------------------------ |
| `users`            | 本人 + 同 group member の表示情報   | 本人のみ update              |
| `groups`              | active member               | admin RPC                |
| `group_members`       | 同 group member              | admin / leave RPC        |
| `group_invites`       | admin                       | admin RPC                |
| `wallets`             | 本人のみ                        | wallet RPC               |
| `wallet_ledger`       | 本人のみ                        | wallet RPC               |
| `secrets`             | owner / access holder       | owner の出品前 RPC           |
| `secret_group_items`  | 同 group member の metadata   | seller RPC               |
| `auctions`            | 同 group member              | auction RPC              |
| `bids`                | bidder / seller。その他は匿名 view | `place_bid` RPC          |
| `secret_accesses`     | 本人                          | `finalize_auction` RPC   |
| `challenges`          | 同 group member + system     | admin / challenge RPC    |
| `challenge_attempts`  | 同 group member              | challenge RPC            |
| `challenge_approvals` | 同 group member              | `approve_challenge` RPC  |


---



## 8. インデックス

必須候補:

```text
users(id)
groups(id)
group_members(group_id, user_id)
group_members(user_id, status)
wallets(group_id, user_id)
wallet_ledger(group_id, user_id, created_at desc)
secrets(owner_id, created_at desc)
secret_group_items(group_id, status, updated_at desc)
secret_group_items(secret_id, group_id)
auctions(group_id, status, starts_at, ends_at)
auctions(secret_group_item_id)
bids(auction_id, amount desc, created_at asc)
bids(group_id, bidder_id, created_at desc)
secret_accesses(user_id, group_id, granted_at desc)
challenge_attempts(group_id, user_id, challenge_id, created_at desc)
challenge_approvals(attempt_id, approver_id)
```

部分 unique 候補:

```text
1 つの secret_group_item につき同時に active auction は 1 つ
  unique(secret_group_item_id)
  where status in ('pending_dealer_approval', 'open', 'finalizing')
```

---



## 9. Realtime 方針

Realtime は table を直接購読してもよいが、購読対象は group_id で必ず絞る。

MVP 購読候補:


| 対象                   | 用途                                           |
| -------------------- | -------------------------------------------- |
| `auctions`           | status / current_price / ends_at の更新         |
| `bids`               | bid_count / 最新価格の反映。ただし raw bidder_id を公開しない |
| `challenge_attempts` | 承認進捗                                         |
| `group_members`      | メンバー変動                                       |


注意:

- bid の匿名性が必要な画面では、raw `bids` 購読ではなく RPC / view / broadcast 用の匿名イベントを検討する
- 他グループの変更が購読で漏れないよう、チャネル名と filter に `group_id` を含める

---



## 10. トランザクション設計



### 10.0 ディーラー承認・辞退（P1・P12）

```text
approve_dealer_assignment
  1. auction を status = 'pending_dealer_approval' 条件で FOR UPDATE
  2. 呼び出しユーザーが auctions.dealer_id 本人であることを確認
  3. group_auction_settings.auction_open_seconds を取得
  4. auctions.dealer_approved_at = now()
  5. auctions.starts_at = now()
  6. auctions.ends_at = now() + auction_open_seconds
  7. auctions.status = 'open'
```

```text
decline_dealer
  1. auction を status = 'pending_dealer_approval' 条件で FOR UPDATE
     （'open' 以降なら中断。開始後の辞退は不可）
  2. 呼び出しユーザーが auctions.dealer_id 本人であることを確認
  3. dealer wallet を FOR UPDATE
  4. fee = secret_group_items.asking_price * dealer_decline_fee_rate（5%）を debit（allow_negative）
  5. dealer_declines insert（fee_amount, wallet_ledger_id）
  6. 出品者以外・現 dealer 以外の active group member からランダムに新 dealer を選抜
  7. auctions.dealer_id を新 dealer に更新
  8. auctions.status は 'pending_dealer_approval' のまま
```

タイムアウト監視の cron は設けない（P1 確定）。ディーラーが承認も辞退もしない限り、auction は無期限に `pending_dealer_approval` のままになる（運用上のリスクとして `PRD.md` §9 に記載）。

### 10.1 入札

```text
place_bid
  1. auction を FOR UPDATE
  2. group membership を確認
  3. auction.status = open を確認
  4. now() が starts_at / ends_at の範囲内か確認
  5. bidder が seller / dealer でないことを確認
  6. bidder wallet を FOR UPDATE
  7. balance >= amount を確認
  8. amount > current_price を確認
  9. bids insert
 10. auctions.current_price update
```

wallet は減らさない。落札確定時だけ debit する。

### 10.2 落札確定

`finalize_auction` は 2 段階に分ける。ends_at 到達直後に `finalizing` へ状態遷移させることで、cron の重複起動を防ぎつつ、クライアントには「入札締切・確定処理中」を表示できるようにする。

**Stage A: 締切クレーム（**`claim_auction_for_finalize`**。軽量・単独トランザクション）**

```text
claim_auction_for_finalize
  1. auction を status = 'open' AND ends_at <= now() 条件で FOR UPDATE
  2. 条件を満たさなければ何もせず終了（他プロセスが既にクレーム済み）
  3. auctions.status = 'finalizing' に更新して commit
```

**Stage B: 按分・確定本処理（**`finalize_auction`**。Stage A とは別トランザクション）**

```text
finalize_auction
  1. auction を status = 'finalizing' 条件で FOR UPDATE
     条件を満たさなければ二重実行とみなし中断
  2. bids を amount desc, created_at asc の順で候補として取得
     （status = 'valid' のみ。次点繰り上げの詳細は §10.2.1）
  3. 候補が 0 件なら no_sale 処理（§10.3）へ
  4. 候補を先頭から順に評価する
     4a. 候補 bidder の wallet を FOR UPDATE
     4b. balance >= 候補 bid.amount なら、この候補を winner として確定し 5. へ
     4c. 満たさなければこの bid を status = 'failed' にし、次の候補へ（4. を繰り返す）
     4d. 候補を使い切っても winner が決まらなければ no_sale 処理（§10.3）へ
  5. winner bid を status = 'winning' に更新。final_price = winner bid.amount
  6. seller / dealer wallet を FOR UPDATE
  7. winner から final_price debit（追加振込なし。P5 確定）
  8. seller へ final_price * 0.70、dealer へ final_price * 0.30 を credit（P7 確定）
  9. secret_accesses insert
 10. secret_group_items.status = sold
 11. auctions.status = sold、winner_id / winning_bid_id / final_price / seller_share_amount / dealer_share_amount を確定
```



#### 10.2.1 次点繰り上げ（winner 残高不足時）

- 確定時点で最高額の入札者の残高が不足している場合、その bid は `failed` にして無効化し、次に高い有効な bid の入札者へ順に繰り上げる（DB-2 の解決方針）。
- 繰り上げられた入札者が支払うのは**自分自身の入札額**（トップ入札者の額ではない）。`final_price` も繰り上げられた bid の `amount` に従う。
- 入札時点（`place_bid`）でも `balance >= amount` を確認済みだが、他の auction の確定や不落札没収など、入札後の残高変動により確定時点で不足し得るため、この探索が必要になる。
- 候補を全て使い切って誰も支払えない場合は no_sale として扱う（§10.3）。
- seller / dealer への按分・入札者以外への開示ルールは、通常の落札確定と同一。誰が繰り上げで落札したかを他の入札者に開示するかどうかは、通常の入札可視性ルール（出品者・ディーラーのみ入札者を識別可能。P9 確定）に従う。



### 10.3 不落札

`finalize_auction` の Stage B（候補が 0 件、または全候補が残高不足）から続けて実行する。auction 行のロックは Stage B から引き継ぐため、改めて取得し直さない。

```text
no_sale
  1. （auction 行のロックは finalize_auction Stage B から継続）
  2. seller wallet を FOR UPDATE
  3. listing_prepay_amount（= P4 の実値、出品価格と同額）を全額没収 debit
  4. 残高不足でも allow_negative = true（P11 確定。上限なし）
  5. secret_group_items.current_value = asking_price * (1 - 0.20)（P6 確定）
  6. secret_group_items.status = returned
  7. auctions.status = no_sale
```

前払い没収（3.）と秘密の目減り（5.）は独立した処理であり、前払いは目減り率とは無関係に**全額**没収する（`オークションルール.md` §2.2）。

---



## 11. セキュリティ / プライバシー

- `secrets.body` を一覧 API や Realtime に含めない
- 出品後の `secrets.body` 更新は拒否する
- 落札後に出品者が非公開へ戻す操作は設けない
- wallet は直接 update させない
- `SECURITY DEFINER` Function は `search_path` を固定する
- Function 冒頭で必ず `auth.uid()` と `group_id` の所属確認をする
- サービスロール前提の通常 UI 操作を作らない
- invite code は hash 保存し、平文は発行時のみ表示する

---



## 12. Migration 実装順

1. enum / helper function
2. users / groups / group_members / group_invites
3. wallets / wallet_ledger / wallet helper
4. secrets / secret_group_items
5. group_auction_settings
6. auctions / bids / secret_accesses / dealer_declines
7. challenges / challenge_attempts / challenge_approvals
8. views
9. RLS policies
10. RPC
11. seed.sql

---



## 13. テスト観点

危険領域を優先する。


| 観点      | 最低確認                                                                                         |
| ------- | -------------------------------------------------------------------------------------------- |
| グループ分離  | A group user が B group wallet / secret / auction を読めない                                       |
| wallet  | 直接 update 不可。RPC では ledger と balance が一致                                                     |
| 入札      | 自出品不可、dealer 不可、残高不足不可、現在価格以下不可                                                              |
| エスクローなし | bid insert だけでは balance が減らない                                                                |
| 落札確定    | winner debit、seller/dealer credit、access grant が Stage B の同一 TX                              |
| 次点繰り上げ  | トップ入札者の残高不足時、その bid が `failed` になり次点が `winning` になる。繰り上げ後の `final_price` は繰り上げ者自身の入札額        |
| 二重確定防止  | `claim_auction_for_finalize` の重複起動、および Stage A/B 間で同一 auction が二重に `finalize_auction` されないこと |
| 不落札     | prepay 没収でマイナス残高になり得る。候補全滅（全員残高不足）でも no_sale になる                                             |
| 秘密本文    | 落札前に owner 以外が読めない。落札後は winner が読める                                                          |
| チャレンジ   | 自己承認不可、必要承認数到達時に一度だけ付与                                                                       |
| ディーラー承認 | `pending_dealer_approval` 以外では `approve_dealer_assignment` / `decline_dealer` が失敗する。dealer 本人以外は実行不可 |
| ディーラー辞退 | 辞退のたびに `asking_price * 5%` が debit され、`dealer_id` が新しい dealer に更新される。`open` 後は辞退不可 |
| 入札者開示   | seller・dealer は `bidder_identified_view` で bidder を識別できる。それ以外は匿名 view のみ                        |


---



## 14. 未確定 / 要確認


| ID       | 内容                                                                   | 影響                                   |
| -------- | -------------------------------------------------------------------- | ------------------------------------ |
| ~~DB-1~~ | ~~P1-P7, P9-P12 の具体値~~ → **解決済み（2026-08-17）**。`PRD.md` §6 / `オークションルール.md` §5 を正とし、本書に反映済み | settings / finalize / dealer decline |
| ~~DB-2~~ | ~~finalize 時に winner 残高不足になった場合の扱い~~ → **解決済み**。次点繰り上げ方式を採用（§10.2.1） | 入札後の残高変動との整合                         |
| ~~DB-3~~ | ~~ディーラーに入札者を見せるか~~ → **解決済み**。見せる（P9 確定）                             | `bids` RLS / `bidder_identified_view`（§5.2） |
| ~~DB-4~~ | ~~AI validation を MVP で使うか~~ → **解決済み**。MVP では使わない。`validation_status` 関連を削除 | §3 Enum、§4.9、§15                     |
| DB-5     | チャレンジ内容の粒度                                                           | `challenges` の追加カラム。PRD でもシステム提供コンテンツ自体が未定のため、MVP は汎用的な器のまま先送り |
| ~~DB-6~~ | ~~wallet 残高を他メンバーに公開する UI があるか~~ → **解決済み**。作らない                        | `wallets` RLS / ranking view（追加なし）   |
| ~~DB-7~~ | ~~コメント / リアクションを MVP に入れるか~~ → **解決済み**。MVP には入れない                     | secret viewer 周辺テーブル（追加なし）          |
| DB-8     | ディーラー承認の無期限待機（P1）が長時間放置された場合の運用フォロー（リマインド通知等）                            | Phase 2。MVP は幹事の手動フォローに委ねる（`PRD.md` §9） |


---



## 15. 実装しないもの

以下は既存 docs に旧案として残っていても DB に作らない。

- ショップ商品
- 固定価格購入
- グループ間ポイント移動
- 全所属グループへの一括ポイント付与
- 見知らぬ人同士の公開 SNS 的な閲覧モデル
- AI validation 関連（`validation_status` 等）— DB-4 確定（2026-08-17）。MVP 対象外。Phase 2 で AI validation を採用する場合に改めてカラム追加のマイグレーションを行う
- wallet 残高を他メンバーに公開する view / ランキング機能 — DB-6 確定（2026-08-17）。MVP は本人のみ残高を閲覧できる
- 秘密 / オークションへのコメント・リアクション機能とその関連テーブル — DB-7 確定（2026-08-17）


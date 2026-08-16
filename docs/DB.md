# DB 設計 — 秘密オークション（仮）

ステータス: 初期設計ドラフト  
作成日: 2026-08-16  
対象: Supabase PostgreSQL / Auth / Realtime / Storage  

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
  1 ─ 1 profiles
  1 ─ * group_members * ─ 1 groups
  1 ─ * wallets       * ─ 1 groups

profiles
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

| 型 | 値 |
| --- | --- |
| `member_role` | `member`, `admin` |
| `member_status` | `active`, `left`, `kicked` |
| `secret_item_status` | `registered`, `listed`, `on_auction`, `sold`, `returned`, `withdrawn` |
| `auction_status` | `scheduled`, `open`, `finalizing`, `sold`, `no_sale`, `canceled` |
| `bid_status` | `valid`, `superseded`, `winning`, `canceled` |
| `wallet_tx_kind` | `challenge_reward`, `listing_prepay`, `listing_reclaim`, `winning_bid_debit`, `seller_share_credit`, `dealer_share_credit`, `dealer_decline_fee`, `admin_adjustment` |
| `challenge_status` | `active`, `archived` |
| `attempt_status` | `pending`, `approved`, `rejected`, `awarded`, `canceled` |
| `approval_decision` | `approved`, `rejected` |
| `validation_status` | `not_required`, `pending`, `passed`, `failed`, `skipped` |

---

## 4. テーブル設計

### 4.1 `profiles`

Supabase Auth のユーザーに紐づく表示用プロフィール。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK。`auth.users.id` |
| `nickname` | `text` | not null |
| `avatar_path` | `text` | Storage path。nullable |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |

RLS:

- 本人は select / update 可
- 同じグループ所属者の表示名・アイコンは select 可
- 他グループだけのユーザー情報は直接見せない

---

### 4.2 `groups`

友達グループ本体。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `name` | `text` | not null |
| `icon_path` | `text` | nullable |
| `created_by` | `uuid` | FK `profiles.id` |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |
| `archived_at` | `timestamptz` | nullable |

RLS:

- active member のみ select 可
- insert は RPC `create_group` 経由
- update は admin のみ

---

### 4.3 `group_members`

ユーザーの所属・権限。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `group_id` | `uuid` | PK part / FK `groups.id` |
| `user_id` | `uuid` | PK part / FK `profiles.id` |
| `role` | `member_role` | not null |
| `status` | `member_status` | not null default `active` |
| `joined_at` | `timestamptz` | not null |
| `left_at` | `timestamptz` | nullable |

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

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `code_hash` | `text` | unique。平文コードは保存しない |
| `created_by` | `uuid` | FK `profiles.id` |
| `expires_at` | `timestamptz` | nullable |
| `max_uses` | `int` | nullable |
| `used_count` | `int` | not null default 0 |
| `revoked_at` | `timestamptz` | nullable |
| `created_at` | `timestamptz` | not null |

RLS:

- admin は自グループ invite を select / revoke 可
- 参加処理は `join_group` RPC で code を検証する

---

### 4.5 `group_auction_settings`

オークション未確定パラメータ P1-P12 の置き場。未確定値は null 許容にし、実装時に確定した値から not null 化を検討する。

| カラム | 型 | 対応 |
| --- | --- | --- |
| `group_id` | `uuid` | PK / FK `groups.id` |
| `listing_wait_seconds` | `int` | P1 |
| `auction_open_seconds` | `int` | P2 |
| `start_price_add` | `int` | P3 |
| `start_price_multiplier` | `numeric` | P3 |
| `listing_prepay_rate` | `numeric` | P4 |
| `listing_prepay_fixed` | `int` | P4 |
| `seller_bonus_rate` | `numeric` | P5 |
| `no_sale_depreciation_rate` | `numeric` | P6 |
| `dealer_share_rate` | `numeric` | P7 |
| `seller_share_rate` | `numeric` | P7 |
| `dealer_can_see_bidders` | `boolean` | P9 |
| `min_balance_limit` | `int` | P11 |
| `dealer_decline_fee_fixed` | `int` | P12 |
| `dealer_decline_fee_rate` | `numeric` | P12 |
| `updated_by` | `uuid` | FK `profiles.id` |
| `updated_at` | `timestamptz` | not null |

補足:

- P8 は PRD で「自出品への入札不可」が確定しているため設定化しない
- `dealer_share_rate + seller_share_rate = 1` は、両方 not null になった段階で check する
- MVP で未確定パラメータを固定値運用する場合も、将来の変更履歴のためこのテーブルに保存する

---

### 4.6 `wallets`

グループ内の個人財布。ポイントはグループ横断で合算しない。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `group_id` | `uuid` | PK part / FK `groups.id` |
| `user_id` | `uuid` | PK part / FK `profiles.id` |
| `balance` | `int` | not null。マイナス可 |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |
| `expired_at` | `timestamptz` | グループ脱退時に失効 |

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

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `user_id` | `uuid` | FK `profiles.id` |
| `amount` | `int` | not null。増加は正、減少は負 |
| `balance_after` | `int` | not null |
| `kind` | `wallet_tx_kind` | not null |
| `ref_table` | `text` | 参照元テーブル名 |
| `ref_id` | `uuid` | 参照元 id |
| `created_by` | `uuid` | 実行ユーザー。cron 等は nullable |
| `created_at` | `timestamptz` | not null |

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

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `owner_id` | `uuid` | FK `profiles.id` |
| `body` | `text` | 秘密本文。落札まで秘匿 |
| `summary` | `text` | ディーラー・一覧用の概要。本文を直接含めすぎない |
| `category` | `text` | 恋愛 / 黒歴史 / 趣味 / 特技など。初期は text、安定後 lookup 化 |
| `rarity` | `smallint` | 自己申告。例: 1-5 |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |
| `deleted_at` | `timestamptz` | 出品前削除用 soft delete |

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

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `secret_id` | `uuid` | FK `secrets.id` |
| `group_id` | `uuid` | FK `groups.id` |
| `seller_id` | `uuid` | FK `profiles.id`。基本は `secrets.owner_id` |
| `status` | `secret_item_status` | not null |
| `asking_price` | `int` | 出品者の自己設定価格 |
| `current_value` | `int` | 不落札目減り後の価値 |
| `validation_status` | `validation_status` | AI validation の状態 |
| `validation_note` | `text` | nullable |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |

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

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `secret_group_item_id` | `uuid` | FK `secret_group_items.id` |
| `seller_id` | `uuid` | FK `profiles.id` |
| `dealer_id` | `uuid` | FK `profiles.id` |
| `status` | `auction_status` | not null |
| `starting_price` | `int` | not null |
| `current_price` | `int` | not null |
| `starts_at` | `timestamptz` | not null |
| `ends_at` | `timestamptz` | not null |
| `winner_id` | `uuid` | nullable |
| `winning_bid_id` | `uuid` | nullable |
| `final_price` | `int` | nullable |
| `listing_prepay_amount` | `int` | P4 の実値 |
| `seller_share_amount` | `int` | 確定時に保存 |
| `dealer_share_amount` | `int` | 確定時に保存 |
| `no_sale_depreciation_amount` | `int` | 不落札時に保存 |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |
| `finalized_at` | `timestamptz` | nullable |

制約:

- `seller_id <> dealer_id`
- `starts_at < ends_at`
- `starting_price >= 0`
- `current_price >= starting_price`
- `dealer_id` は同 group の active member
- `dealer_id` は当該 auction に入札不可
- `seller_id` は当該 auction に入札不可

RLS:

- group member は一覧・詳細 metadata を select 可
- 本文は見せない
- seller は自分の auction の入札者識別情報を view 経由で見られる
- dealer は本文を見られず、概要のみ見られる
- insert / update は RPC のみ

---

### 4.11 `bids`

入札履歴。エスクローはしないため、insert 時点では wallet を減らさない。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `auction_id` | `uuid` | FK `auctions.id` |
| `bidder_id` | `uuid` | FK `profiles.id` |
| `amount` | `int` | not null |
| `status` | `bid_status` | not null default `valid` |
| `created_at` | `timestamptz` | not null |

制約:

- `amount > 0`
- `bidder_id` は active group member
- `bidder_id <> auctions.seller_id`
- `bidder_id <> auctions.dealer_id`
- `amount > auctions.current_price`
- `wallets.balance >= amount` を `place_bid` RPC 内で確認

直接 CHECK では他テーブル参照できないため、入札制約は `place_bid` RPC と transaction lock で保証する。

RLS:

- direct insert は禁止。`place_bid` RPC のみ
- bidder は自分の bid を select 可
- seller は自分の auction の bid を bidder 識別付きで select 可
- その他 group member は匿名化 view のみ
- dealer への bidder 開示は P9 確定まで direct select させない

---

### 4.12 `secret_accesses`

落札後の閲覧権。コレクション表示の正本。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `secret_id` | `uuid` | FK `secrets.id` |
| `secret_group_item_id` | `uuid` | FK `secret_group_items.id` |
| `auction_id` | `uuid` | FK `auctions.id` |
| `user_id` | `uuid` | FK `profiles.id` |
| `granted_at` | `timestamptz` | not null |

制約:

- unique `(auction_id, user_id)`
- winner にのみ作成
- owner 本人の閲覧は `secrets.owner_id` で認めるため、owner 用 access 行は不要

RLS:

- user は自分の access を select 可
- 本文閲覧は `my_secret_collection_view` / RPC で `secret_accesses` を確認して返す

---

### 4.13 `dealer_declines`

ディーラー辞退履歴。P12 が確定するまで実値は nullable を許容する。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `auction_id` | `uuid` | FK `auctions.id` |
| `dealer_id` | `uuid` | FK `profiles.id` |
| `fee_amount` | `int` | 辞退料 |
| `wallet_ledger_id` | `uuid` | FK `wallet_ledger.id` |
| `created_at` | `timestamptz` | not null |

RLS:

- auction 関係者と admin は select 可
- insert は `decline_dealer` RPC のみ

---

### 4.14 `challenges`

ミニゲーム / チャレンジの定義。システム提供内容は未定のため、まずは汎用的な器にする。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | nullable。null は system challenge |
| `created_by` | `uuid` | nullable。group 独自なら admin |
| `title` | `text` | not null |
| `description` | `text` | nullable |
| `reward_points` | `int` | not null |
| `requires_evidence_photo` | `boolean` | default false |
| `required_approvals` | `int` | not null default 1 |
| `cooldown_seconds` | `int` | nullable |
| `status` | `challenge_status` | not null |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |

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

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `id` | `uuid` | PK |
| `group_id` | `uuid` | FK `groups.id` |
| `challenge_id` | `uuid` | FK `challenges.id` |
| `user_id` | `uuid` | FK `profiles.id` |
| `status` | `attempt_status` | not null |
| `evidence_path` | `text` | Storage path |
| `reward_points` | `int` | 承認時点の実値を保存 |
| `awarded_ledger_id` | `uuid` | FK `wallet_ledger.id` |
| `created_at` | `timestamptz` | not null |
| `updated_at` | `timestamptz` | not null |
| `awarded_at` | `timestamptz` | nullable |

制約:

- `user_id` は active group member
- cooldown / 獲得上限は `submit_challenge` RPC で確認

RLS:

- group member は同 group の attempt 進捗を select 可
- insert / status update は RPC のみ

---

### 4.16 `challenge_approvals`

複数人承認の記録。

| カラム | 型 | 制約 / 用途 |
| --- | --- | --- |
| `attempt_id` | `uuid` | PK part / FK `challenge_attempts.id` |
| `approver_id` | `uuid` | PK part / FK `profiles.id` |
| `decision` | `approval_decision` | not null |
| `created_at` | `timestamptz` | not null |

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

| bucket | 用途 | 公開 |
| --- | --- | --- |
| `avatars` | user / group icon | public または signed URL |
| `challenge-evidence` | チャレンジ写真 | private |

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

### 5.2 `seller_bid_view`

出品者向け。自分の auction の入札者を識別可能にする。

含める:

- `auction_id`
- `bid_id`
- `bidder_id`
- `bidder_nickname`
- `amount`
- `created_at`

RLS / view 条件:

- `auctions.seller_id = auth.uid()`

### 5.3 `anonymous_bid_feed_view`

出品者以外の参加者向け。

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

| RPC | 責務 |
| --- | --- |
| `create_group(name, icon_path)` | group 作成、作成者を admin member にする、wallet 初期化、settings 初期化 |
| `join_group(invite_code)` | invite 検証、member 追加、wallet 初期化 |
| `leave_group(group_id)` | member status を left、wallet を expired。最後の admin なら拒否 |
| `update_group_member_role(group_id, user_id, role)` | admin 権限付与 / 剥奪。最後の admin 剥奪は拒否 |
| `kick_group_member(group_id, user_id)` | admin による kick。wallet 失効 |

### 6.2 秘密 / 出品

| RPC | 責務 |
| --- | --- |
| `register_secret(group_id, body, summary, category, rarity, asking_price)` | secrets と secret_group_items を作成。MVP は選択中 group のみ |
| `update_secret_before_listing(secret_id, ...)` | 出品前のみ編集 |
| `delete_secret_before_listing(secret_id)` | 出品前のみ soft delete |
| `publish_secret_to_group(secret_id, group_id, asking_price)` | Phase 2 の複数 group 公開用 |
| `list_secret_for_auction(secret_group_item_id)` | listed 化、開始時刻計算、dealer 選抜、前払い credit |

### 6.3 オークション / 入札

| RPC | 責務 |
| --- | --- |
| `open_due_auctions()` | `scheduled` かつ `starts_at <= now()` を `open` にする |
| `place_bid(auction_id, amount)` | 所属・状態・残高・価格・自出品不可・dealer 不可を検証し bid 作成、current_price 更新 |
| `finalize_auction(auction_id)` | 終了済み auction を確定。勝者 debit、按分 credit、閲覧権付与、status 更新 |
| `finalize_due_auctions()` | cron 用。終了時刻を過ぎた open auction をまとめて確定 |
| `decline_dealer(auction_id)` | 辞退料 debit、dealer_declines 追加、dealer 再選抜 |

`place_bid` の必須 lock:

- 対象 `auctions` 行を `FOR UPDATE`
- bidder の `wallets` 行を `FOR UPDATE`
- 最新価格を transaction 内で再確認

`finalize_auction` の必須 lock:

- 対象 `auctions` 行を `FOR UPDATE`
- winner / seller / dealer の `wallets` 行を `FOR UPDATE`
- 二重 finalize 防止の status 再確認

### 6.4 チャレンジ / ポイント付与

| RPC | 責務 |
| --- | --- |
| `submit_challenge(group_id, challenge_id, evidence_path)` | 所属・cooldown・上限を確認して attempt 作成 |
| `approve_challenge(attempt_id, decision)` | 自己承認不可、承認数集計、必要数到達時に wallet credit |
| `create_group_challenge(group_id, ...)` | admin による group 独自 challenge 作成 |

### 6.5 wallet 内部関数

外部公開しない内部 helper。

| Function | 責務 |
| --- | --- |
| `_credit_wallet(group_id, user_id, amount, kind, ref_table, ref_id)` | wallet 加算と ledger 追加 |
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

| テーブル | select | insert / update / delete |
| --- | --- | --- |
| `profiles` | 本人 + 同 group member の表示情報 | 本人のみ update |
| `groups` | active member | admin RPC |
| `group_members` | 同 group member | admin / leave RPC |
| `group_invites` | admin | admin RPC |
| `wallets` | 本人のみ | wallet RPC |
| `wallet_ledger` | 本人のみ | wallet RPC |
| `secrets` | owner / access holder | owner の出品前 RPC |
| `secret_group_items` | 同 group member の metadata | seller RPC |
| `auctions` | 同 group member | auction RPC |
| `bids` | bidder / seller。その他は匿名 view | `place_bid` RPC |
| `secret_accesses` | 本人 | `finalize_auction` RPC |
| `challenges` | 同 group member + system | admin / challenge RPC |
| `challenge_attempts` | 同 group member | challenge RPC |
| `challenge_approvals` | 同 group member | `approve_challenge` RPC |

---

## 8. インデックス

必須候補:

```text
profiles(id)
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
  where status in ('scheduled', 'open', 'finalizing')
```

---

## 9. Realtime 方針

Realtime は table を直接購読してもよいが、購読対象は group_id で必ず絞る。

MVP 購読候補:

| 対象 | 用途 |
| --- | --- |
| `auctions` | status / current_price / ends_at の更新 |
| `bids` | bid_count / 最新価格の反映。ただし raw bidder_id を公開しない |
| `challenge_attempts` | 承認進捗 |
| `group_members` | メンバー変動 |

注意:

- bid の匿名性が必要な画面では、raw `bids` 購読ではなく RPC / view / broadcast 用の匿名イベントを検討する
- 他グループの変更が購読で漏れないよう、チャネル名と filter に `group_id` を含める

---

## 10. トランザクション設計

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

```text
finalize_auction
  1. auction を FOR UPDATE
  2. status / ends_at を確認
  3. 最高 bid を決定
  4. bid がなければ no_sale 処理
  5. bid があれば winner / seller / dealer wallet を FOR UPDATE
  6. winner から final_price debit
  7. seller / dealer へ按分 credit
  8. secret_accesses insert
  9. secret_group_items.status = sold
 10. auctions.status = sold
```

winner の残高が入札後に別操作で不足している場合の扱いは未決。安全側では finalize 時にも `balance >= final_price` を要求し、失敗時の運用を P11 と合わせて決める。

### 10.3 不落札

```text
no_sale
  1. auction を FOR UPDATE
  2. seller wallet を FOR UPDATE
  3. listing_prepay_amount を没収 debit
  4. 残高不足でも allow_negative = true
  5. secret_group_items.current_value を目減り
  6. secret_group_items.status = returned
  7. auctions.status = no_sale
```

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
2. profiles / groups / group_members / group_invites
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

| 観点 | 最低確認 |
| --- | --- |
| グループ分離 | A group user が B group wallet / secret / auction を読めない |
| wallet | 直接 update 不可。RPC では ledger と balance が一致 |
| 入札 | 自出品不可、dealer 不可、残高不足不可、現在価格以下不可 |
| エスクローなし | bid insert だけでは balance が減らない |
| 落札確定 | winner debit、seller/dealer credit、access grant が同一 TX |
| 不落札 | prepay 没収でマイナス残高になり得る |
| 秘密本文 | 落札前に owner 以外が読めない。落札後は winner が読める |
| チャレンジ | 自己承認不可、必要承認数到達時に一度だけ付与 |

---

## 14. 未確定 / 要確認

| ID | 内容 | 影響 |
| --- | --- | --- |
| DB-1 | P1-P7, P9-P12 の具体値 | settings / finalize / dealer decline |
| DB-2 | finalize 時に winner 残高不足になった場合の扱い | 入札後の残高変動との整合 |
| DB-3 | ディーラーに入札者を見せるか | `bids` RLS / dealer view |
| DB-4 | AI validation を MVP で使うか | `validation_status` と Edge Function |
| DB-5 | チャレンジ内容の粒度 | `challenges` の追加カラム |
| DB-6 | wallet 残高を他メンバーに公開する UI があるか | `wallets` RLS / ranking view |
| DB-7 | コメント / リアクションを MVP に入れるか | secret viewer 周辺テーブル |

---

## 15. 実装しないもの

以下は既存 docs に旧案として残っていても DB に作らない。

- ショップ商品
- 固定価格購入
- グループ間ポイント移動
- 全所属グループへの一括ポイント付与
- 見知らぬ人同士の公開 SNS 的な閲覧モデル


# TRD（技術要件定義書）— 秘密オークション（仮）

ステータス: 確定（スタックは `技術選定.md`、ディレクトリ構成は `アーキテクチャ.md` を参照。本ファイルはアーキ・配置・非機能・実装境界。2026-09-30 に実装へ追随）  
作成日: 2026-08-14  
言語: 日本語  
対象: PWA 一本（iOS Web Push 制約は受け入れる）

---

## 0. 文書の位置づけ

| 文書 | 役割 |
| --- | --- |
| **本 TRD** | 技術の上位要件（アーキ、ロジック配置、データ境界、非機能、MVP/Phase2 の技術範囲） |
| [`技術選定.md`](./技術選定.md) | スタック一覧・Phase 分け・選定理由の**参照正**（本 TRD に複製して置き換えない） |
| [`PRD.md`](./PRD.md) | プロダクト上位要件 |
| [`オークションルール.md`](./オークションルール.md) | オークション挙動の正 |
| [`AGENTS.md`](../AGENTS.md) | AI 実装の DoD・作業規律 |

衝突時: **PRD の確定方針 > オークションルール > 本 TRD の実装方針 > 技術選定のツール詳細**。  
スキーマ・RPC の具体名・カラムの正は [`DB.md`](./DB.md)（実装は `prisma/schema.prisma` と `prisma/sql/`）。本 TRD の §6・§7 は論理モデルの要約。

---

## 1. システム概要

```text
[ PWA: React 19 + Next.js (App Router) + Prisma + RHF/Zod + Tailwind/shadcn ]
                    │
                    ▼
            Supabase (BaaS 完結)
     ┌──────────┼──────────┬────────────┐
  Auth      Postgres     Realtime    Storage
              │             │
         RLS + SQL       購読更新
         Functions
              │
         Edge Functions（外部 I/O）
```

- ネイティブアプリは作らない
- ホスティング: Vercel（`vercel.json`。リージョン hnd1）
- ビジネスの中心: **PostgreSQL Function**。外部 HTTP / Storage 連携は **Edge Functions**

スタックの列挙・Phase 別ツール導入は **`技術選定.md` を見ること**（ここには再掲しない）。

---

## 2. ロジック配置方針（確定）

| 処理 | 置き場 | 理由 |
| --- | --- | --- |
| 入札（価格検証・ロック・残高・更新） | PostgreSQL Function | 同一 TX・レース防止 |
| ポイント credit / debit | PostgreSQL Function | グループ分離を SQL で強制 |
| オークション終了確定 | PostgreSQL Function（`pg_cron` 等から） | 複数テーブル一括更新 |
| 出品確定・前払い振込・不落札没収 | PostgreSQL Function | ウォレット整合 |
| 落札時の按分（ディーラー/出品者） | PostgreSQL Function | 按分比は設定値。出品者70% : ディーラー30%（P7 確定） |
| チャレンジ承認集計→付与 | PostgreSQL Function | 承認と付与を同一 TX |
| プッシュ通知 | Edge Function | Web Push 等の外部 I/O |
| 写真提出の検証・Storage 連携 | Edge Function | 外部/ファイル処理 |
| 秘密価格の AI validation | — | **MVP では実施しない（DB-4 確定）**。Phase 2 で Edge Function 経由の再検討候補 |

クライアントから直接「残高を足す」等の危険な更新は行わない。残高変更は RPC（Function）経由のみ。

---

## 3. グループ完全分離（二重防御）

1. **RLS**: `wallets` / `secrets` / `auctions` / `bids` 等、グループ紐づけテーブルは所属メンバーのみ
2. **Function 冒頭チェック**: 引数 `group_id` が呼び出しユーザーの所属と一致することを必ず検証
3. **テスト**: 他グループ Wallet の読み書きが拒否されることを、重要な処理について検証（網羅的 pgTAP は Phase 2。技術選定参照）

不変条件に反する API・UI（全グループ一斉ポイント付与、グループ間送金）は実装しない（PRD §3, §5.3）。

---

## 4. 認証（Auth）

**方針: Supabase Auth を使い、方式は広めに許容する。**

| 項目 | MVP | 備考 |
| --- | --- | --- |
| Supabase Auth | ✅ | Email / Password / OAuth（Google 等）を技術的に許容 |
| どの provider を本番でオンにするか | **Google OAuth・メールアドレス+パスワードを実装済み**（Google: 2026-08-18導入、メール+パスワード: issue #76、2026-08-22。`features/auth/`） | 当初実装したMagic Linkはissue #76実装時、UIに導線が無いため削除した（2026-08-22）。詳細は `docs/技術選定.md` |
| プロフィール（ニックネーム・アイコン） | ✅ | `users` 等で Auth ユーザーに紐づけ |

セッションは Supabase クライアントの標準フローに従う。

---

## 5. Realtime（MVP）

**方針: 必要なところから足す。** 当初は広く購読する想定だったが、実装したのはオークションのみ。

| 領域 | 状態 | 備考 |
| --- | --- | --- |
| オークション詳細の現在価格・入札更新 | 実装済み | `auctions` を `supabase_realtime` に追加（`prisma/sql/auctions/006_realtime.sql`）、クライアントは `features/auctions/components/use-auction-realtime.ts` |
| オークション一覧の状態変化（開始/終了） | 未実装 | 一覧は再読み込みで更新 |
| チャレンジ承認の進捗 | 未実装 | 承認待ちタブの再読み込みで確認 |
| グループお知らせ・メンバー変動 | 未実装 | |
| Web Push 相当のオフライン通知 | Phase 2 | 技術選定 |

チャネル設計（テーブル変更の filter、`group_id` スコープ）は実装時に決定。**他グループの変更が漏れないこと**を必須とする。

---

## 6. 論理データモデル（草案）

物理 DDL は未作成。実装時に Migrations で確定する。論理エンティティのみ示す。

| エンティティ | 要点 |
| --- | --- |
| `users` | ユーザー表示名、アイコン |
| `groups` | グループ名・アイコン、`auction_open_seconds`（オークション開放時間。値は P1–P12 確定。これだけ幹事が変更可。他の固定値はアプリ定数。2026-08-17: `group_auction_settings`テーブルは廃止。`DB.md` §4.5） |
| `group_members` | 所属、役割（member / admin） |
| `wallets` | `(group_id, user_id)` 一意。残高（**マイナス可**）。入札は残高不足なら拒否 |
| `wallet_ledger` | グループ単位の増減履歴 |
| `secrets` | タイトル・概要（ディーラー限定）・本文、カテゴリ、レア度（自己申告）。状態は `secret_group_items.status`（registered → listed → on_auction → sold / returned） |
| `secret_group_items` / `auctions` | 出品（グループごとの秘密の扱い）・競り。開始価格 = 出品価格（P3）、開始はディーラー承認によるイベント駆動（P1）、開放時間はグループ設定値・既定24時間（P2）、ディーラー |
| `bids` | 入札。**エスクローなし**（負けても残高拘束・消費なし）。勝者確定時のみ debit |
| `challenges` / `challenge_attempts` | 幹事作成・共通（`group_id` null）の両対応。承認は単一承認で `challenge_attempts.reviewed_*` に記録（`challenge_approvals` は廃止）。システム提供内容は未定 |
| 落札閲覧権・コレクション | 独立テーブルは持たず `auctions.winner_id` が閲覧権の正本（`DB.md` §4.12） |

### 6.1 入札・残高の技術的帰結（PRD 確定事項）

- **エスクローなし**: 入札行の insert だけでは `wallets.balance` を減らさない。落札確定時に勝者のみ debit
- **自出品入札不可**: Function 内で `auction` の出品者と `auth.uid()` を比較して拒否
- **マイナス残高**: 不落札没収等で balance &lt; 0 を許容し得る。ただし **入札 RPC は `balance >= bid_amount` を要求**（入札で借金を増やさない）
- **按分・前払い・目減り**: P4–P7 は確定済み（前払い100%、追加振込なし、目減り20%、按分70:30）。値はアプリ定数（`features/auctions/constants.ts`）とPostgreSQL Function内のリテラルで保持する（`DB.md` §4.5）

### 6.2 AI validation（MVP 対象外・確定）

- DB-4 確定（2026-08-17）により、**MVP では実施しない**。出品内容のチェックなしで登録を通す
- Phase 2 で無料枠の推論 API 等が使える場合に再検討する

---

## 7. API / RPC 境界（論理）

クライアントが直接叩く想定の操作（名前は仮）。

| RPC / 操作 | 責務 | 備考 |
| --- | --- | --- |
| `create_group` / `join_group_via_invite_link` / `create_group_invite_link` / `revoke_group_invite_link` | 作成・URL 招待による参加・招待URLの発行/取り消し | 幹事の初期設定 |
| `register_secret` | 登録（未出品） | AI validation は MVP 対象外 |
| `list_secret_for_auction`（出品実施） | 状態遷移（`pending_dealer_approval`）。dealer ランダム選抜も同時に行う | 前払い（P4・出品価格の100%）は出品時ではなくディーラー承認時に credit |
| `approve_dealer_assignment` | ディーラー承認。`open` へ遷移し `starts_at`/`ends_at` を確定（P1・P2）。出品者へ前払いを credit（P4） | ディーラー本人のみ |
| `place_bid` | 入札可能チェック・insert | エスクローなし。自出品不可。残高不足不可 |
| `claim_auction_for_finalize` / `finalize_auction` / `finalize_due_auctions` | 終了確定（2段階）・落札 debit・次点繰り上げ・按分（P7・出品者70:ディーラー30）・状態更新 | cron から（`prisma/sql/auctions/007_finalize_cron.sql`） |
| `decline_dealer` | 辞退料 debit（P12 確定・出品価格の5%、完全没収）・再割当 | 開始（承認）前のみ可 |
| `submit_challenge` / `approve_challenge` / `create_group_challenge` | 提出・承認（単一承認）・付与・幹事によるチャレンジ作成 | グループ紐づけ必須 |
| `leave_group` | 脱退・当該 wallet 失効 | |

読取は RLS 下の Query を基本とし、集計や秘匿（他者への入札者非開示）は View / Function で制御する。

### 7.1 情報非対称（入札者の見え方）

- 出品者・ディーラー: 入札者を識別可能（P9 確定）
- その他参加者: 入札者を識別不可（額・時刻などの公開範囲は UI 要件に合わせて制限）

---

## 8. ストレージ・メディア

| 用途 | MVP | 備考 |
| --- | --- | --- |
| アイコン画像 | ✅ | Storage + RLS |
| チャレンジ写真 | ✅ | private バケット `challenge-evidence`（5MB・png/jpeg/webp）。検証は `submit_challenge` RPC 内で行い、Edge Function は使っていない。自己承認不可は PRD/機能要件 |

---

## 9. 非機能要件

| 項目 | 要件 |
| --- | --- |
| 整合性 | 入札・決済・按分は TX 内。二重落札・二重 debit 禁止 |
| 分離 | 他グループデータ漏洩は致命傷（RLS + Function チェック） |
| リアルタイム | §5 の広め購読。遅延は「操作可能」を優先し、最終整合はサーバ確定値 |
| セキュリティ | 秘密本文は落札者（と出品者）以外に出さない。サービスロールの乱用禁止 |
| プライバシー | 本人が公開してよい内容のみ、というプロダクト制約を UI でも明示 |
| 可用性 | 小規模グループ用途。SLO 数値は未設定 |
| 観測 | MVP は最小（Supabase ログ等）。本格 APM は未設定 |
| PWA | ホーム画面追加案内。iOS Web Push 制約はオンボーディングで明示（技術選定 §3） |

---

## 10. 技術スコープ（Phase）

詳細ツール表は `技術選定.md` §4。本 TRD での要約:

### 10.1 MVP（Phase 1）

- Frontend / Supabase 一式（技術選定どおり）
- RLS + 主要 PostgreSQL Functions（グループ・秘密・wallet・入札・終了確定）— 実装済み
- Realtime（オークションのみ。§5）
- Auth（Supabase・provider は広め）— Google OAuth・メール+パスワード
- PWA の基本構成（manifest / service worker）— **未着手**（issue #137）
- AI validation は**実施しない**（DB-4 確定）
- マイナス残高スキーマ許容 + 入札時の非負十分残高チェック

### 10.2 Phase 2 見通し

- Playwright E2E、Oxlint/Oxfmt、pgTAP 拡充、Deno 厳格化（技術選定）
- Web Push 本格運用
- AI validation の本採用（無料で足りなかった場合）
- 複数グループへの秘密公開に耐えるデータモデル拡張
- `pg_cron` ↔ Edge 通知の運用固め（技術選定の未確定事項）

### 10.3 技術選定上の未確定（引き継ぎ）

`技術選定.md` §5 より: `pg_cron` と Edge 通知トリガーの具体方式（issue #43 で追跡）のみ。

---

## 11. テスト方針（技術）

| 対象 | MVP | Phase 2 |
| --- | --- | --- |
| 入札 RPC・wallet 整合 | 重点。実 DB に対する検証スクリプト（`npm run verify:auctions` / `verify:auction` / `verify:wallet`） | |
| 他グループ拒否（RLS） | 検証スクリプト（`npm run verify:rls` ほか各ドメインの `verify:*`）で実 DB を確認。結果を PR に残す | pgTAP 拡充 |
| UI | 未導入（Vitest / Testing Library は導入判断待ち。`技術選定.md` §4） | Playwright |
| Auth / Realtime | 手動シナリオ可 | 自動化検討 |

危険領域（Auth / RLS / Wallet / 入札）は PR に検証手順を残す（`AGENTS.md` DoD）。

---

## 12. オープンイシュー（技術）

| ID | 内容 | 依存 |
| --- | --- | --- |
| ~~T1~~ | ~~P1–P7, P9–P12 の定数の置き場~~ → **解決済み**。P2のみ`groups.auction_open_seconds`、他はアプリ定数（`features/auctions/constants.ts`）に確定（`DB.md` §4.5） | PRD §6 |
| T2 | 落札確定の時計（`pg_cron` 間隔、クライアント表示とのズレ） | 技術選定 §5 |
| ~~T3~~ | ~~無料 AI の具体プロバイダとフォールバック~~ → **解消**。AI validation 自体を MVP 対象外に確定（DB-4）したため不要 | PRD §6 P10 |
| ~~T4~~ | ~~ミニゲーム「器」のテーブル粒度~~ → **解決済み**。`challenges` / `challenge_attempts` の2テーブルで実装（`DB.md` §4.14・§4.15） | PRD §5.4 |
| ~~T5~~ | ~~本番で有効化する Auth provider の確定~~ → **解決済み（2026-08-18）**。Magic Linkを実装（§4） → **2026-08-22、Google OAuth・メール+パスワードに切り替え**（UIに導線がないMagic Linkは削除。issue #76） | §4 |
| ~~T6~~ | ~~入札一覧の匿名化を DB でやるか API でやるか~~ → **解決済み**。DB層のview（`bidder_identified_view` / `anonymous_bid_feed_view`）で対応（`prisma/sql/auctions/002_views.sql`） | 情報非対称 |

---

## 13. 改訂履歴

| 日付 | 内容 |
| --- | --- |
| 2026-08-14 | 初版。技術選定は参照のまま分離。Auth 広め / Realtime 広め / エスクローなし入札 / 自出品入札拒否 / マイナス残高許可＋入札は残高チェック / 条件付き AI validation を反映 |
| 2026-08-17 | P1–P12 確定（`PRD.md` §6）を反映。AI validation は MVP 対象外に確定（T3 解消）。P1 の待機時間をディーラー承認によるイベント駆動に変更し、`approve_dealer_assignment` RPC を追加。T1 解決済みにマーク |
| 2026-09-30 | 実装へ追随: スタックを Next.js + Prisma に、ホスティングを Vercel に、RPC 名を実装名に、Realtime をオークションのみ実装済みに、チャレンジ写真・テスト方針の現状を更新。T4 解決済み |

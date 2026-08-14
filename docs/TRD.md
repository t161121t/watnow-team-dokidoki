# TRD（技術要件定義書）— 秘密オークション（仮）

ステータス: ドラフト（スタックは `技術選定.md` を参照。本ファイルはアーキ・配置・非機能・実装境界）  
作成日: 2026-08-14  
言語: 日本語  
対象: PWA 一本（iOS Web Push 制約は受け入れる）

---

## 0. 文書の位置づけ

| 文書 | 役割 |
| --- | --- |
| **本 TRD** | 技術の上位要件（アーキ、ロジック配置、データ境界、非機能、MVP/Phase2 の技術範囲） |
| [`技術選定.md`](./技術選定.md) | スタック一覧・環境構築の完了条件・選定方針の**参照正**（本 TRD に複製して置き換えない） |
| [`PRD.md`](./PRD.md) | プロダクト上位要件 |
| [`オークションルール.md`](./オークションルール.md) | オークション挙動の正 |
| [`AGENTS.md`](../AGENTS.md) | AI 実装の DoD・作業規律 |

衝突時: **PRD の確定方針 > オークションルール > 本 TRD の実装方針 > 技術選定のツール詳細**。  
スキーマ・RPC の具体名・カラムは実装時に Migrations で確定し、決まったら本 TRD を更新する（現状は論理モデル）。

---

## 1. システム概要

```text
[ PWA: React 19 + Vite + TanStack Router/Query + RHF/Zod + Tailwind/shadcn ]
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
- ホスティング想定: Cloudflare Workers Static Assets
- ビジネスの中心: **PostgreSQL Function**。外部 HTTP / Storage 連携は **Edge Functions**

スタックの列挙・環境構築の完了条件は **`技術選定.md` を見ること**（ここには再掲しない）。

---

## 2. ロジック配置方針（確定）

| 処理 | 置き場 | 理由 |
| --- | --- | --- |
| 入札（価格検証・ロック・残高・更新） | PostgreSQL Function | 同一 TX・レース防止 |
| ポイント credit / debit | PostgreSQL Function | グループ分離を SQL で強制 |
| オークション終了確定 | PostgreSQL Function（`pg_cron` 等から） | 複数テーブル一括更新 |
| 出品確定・前払い振込・不落札没収 | PostgreSQL Function | ウォレット整合 |
| 落札時の按分（ディーラー/出品者） | PostgreSQL Function | 按分比は設定値（P7 未定） |
| チャレンジ承認集計→付与 | PostgreSQL Function | 承認と付与を同一 TX |
| プッシュ通知 | Edge Function | Web Push 等の外部 I/O |
| 写真提出の検証・Storage 連携 | Edge Function | 外部/ファイル処理 |
| 秘密価格の AI validation | Edge Function（候補） | 外部モデル API。**無料枠で可能なら MVP**。不可ならスキップ or Phase 2 |

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
| Supabase Auth | ✅ | Email / Magic Link / OAuth（Google 等）を技術的に許容 |
| どの provider を本番でオンにするか | 運用で決定 | 本 TRD では「Supabase Auth 広め」まで固定。特定1方式への絞り込みは未確定 |
| プロフィール（ニックネーム・アイコン） | ✅ | `profiles` 等で Auth ユーザーに紐づけ |

セッションは Supabase クライアントの標準フローに従う。

---

## 5. Realtime（MVP）

**方針: 広め。** コア体験がリアルタイムである必要がある更新は MVP で購読する。

| 領域 | MVP | 備考 |
| --- | --- | --- |
| オークション詳細の現在価格・入札更新 | ✅ | 必須に近い |
| オークション一覧の状態変化（開始/終了） | ✅ | |
| チャレンジ承認の進捗 | ✅ | ミニゲーム内容が写真承認型になった場合に特に有効 |
| グループお知らせ・メンバー変動 | ✅ | 広め方針に含む |
| Web Push 相当のオフライン通知 | | Phase 2（技術選定） |

チャネル設計（テーブル変更の filter、`group_id` スコープ）は実装時に決定。**他グループの変更が漏れないこと**を必須とする。

---

## 6. 論理データモデル（草案）

物理 DDL は未作成。実装時に Migrations で確定する。論理エンティティのみ示す。

| エンティティ | 要点 |
| --- | --- |
| `profiles` | ユーザー表示名、アイコン |
| `groups` | グループ名・アイコン、設定（スケジュール等。数値は未定パラメータ） |
| `group_members` | 所属、役割（member / admin） |
| `wallets` | `(group_id, user_id)` 一意。残高（**マイナス可**）。入札は残高不足なら拒否 |
| `wallet_ledger` | グループ単位の増減履歴 |
| `secrets` | 本文、カテゴリ、レア度（自己申告）、状態（registered → listed → on_auction → sold / returned 等） |
| `secret_listings` / `auctions` | 出品・競り。開始価格、時間窓（P1–P3 未定）、ディーラー |
| `bids` | 入札。**エスクローなし**（負けても残高拘束・消費なし）。勝者確定時のみ debit |
| `challenges` / `challenge_attempts` / `challenge_approvals` | 機能枠。システム提供内容は未定 |
| `collections` 相当 | 落札閲覧権・コレクション表示 |

### 6.1 入札・残高の技術的帰結（PRD 確定事項）

- **エスクローなし**: 入札行の insert だけでは `wallets.balance` を減らさない。落札確定時に勝者のみ debit
- **自出品入札不可**: Function 内で `auction` の出品者と `auth.uid()` を比較して拒否
- **マイナス残高**: 不落札没収等で balance &lt; 0 を許容し得る。ただし **入札 RPC は `balance >= bid_amount` を要求**（入札で借金を増やさない）
- **按分・前払い・目減り**: P4–P7, P6 等が未定のため、定数テーブル or グループ設定で差し替え可能にする

### 6.2 AI validation（条件付き MVP）

- Edge Function から**無料枠**の推論 API（または自前の軽量チェック）を呼ぶ案
- 無料で品質・レートが足りない場合は **呼び出さず登録を通し、Phase 2 で再導入**
- 有料前提の必須化はしない（PRD）

---

## 7. API / RPC 境界（論理）

クライアントが直接叩く想定の操作（名前は仮）。

| RPC / 操作 | 責務 | 備考 |
| --- | --- | --- |
| `create_group` / `join_group` | 作成・参加・招待消費 | 幹事の初期設定 |
| `register_secret` | 登録（未出品） | 任意で validation Edge 呼び出し |
| `list_secret`（出品実施） | 状態遷移 + 前払い credit（P4 未定） | |
| `place_bid` | 入札可能チェック・insert | エスクローなし。自出品不可。残高不足不可 |
| `finalize_auction` | 終了・落札 debit・按分・状態更新 | cron から |
| `decline_dealer` | 辞退料 debit・再割当 | P12 未定 |
| `submit_challenge` / `approve_challenge` | 提出・承認・付与 | 中身未定でもインターフェースはグループ紐づけ必須 |
| `leave_group` | 脱退・当該 wallet 失効 | |

読取は RLS 下の Query を基本とし、集計や秘匿（他者への入札者非開示）は View / Function で制御する。

### 7.1 情報非対称（入札者の見え方）

- 出品者: 入札者を識別可能
- その他参加者: 入札者を識別不可（額・時刻などの公開範囲は UI 要件に合わせて制限）
- ディーラーへの開示（P9）は未定 → 実装はフラグまたは別 RPC で後から開けられる形が望ましい

---

## 8. ストレージ・メディア

| 用途 | MVP | 備考 |
| --- | --- | --- |
| アイコン画像 | ✅ | Storage + RLS |
| チャレンジ写真 | 内容確定後 | Edge で検証。自己承認不可は PRD/機能要件 |

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

詳細ツール表は `技術選定.md` のスタック一覧を参照。本 TRD での要約:

### 10.1 MVP（Phase 1）

- Frontend / Supabase 一式（技術選定どおり）
- RLS + 主要 PostgreSQL Functions（グループ・秘密・wallet・入札・終了確定）
- Realtime（§5 の広め）
- Auth（Supabase・provider は広め）
- AI validation は**無料枠で現実的なら** Edge 経由で接続。否则スキップ可能な設計
- マイナス残高スキーマ許容 + 入札時の非負十分残高チェック

### 10.2 Phase 2 見通し

- pgTAP 拡充、Deno 厳格化（技術選定）
- Web Push 本格運用
- AI validation の本採用（無料で足りなかった場合）
- 複数グループへの秘密公開に耐えるデータモデル拡張
- `pg_cron` ↔ Edge 通知の運用固め（技術選定の未確定事項）

### 10.3 技術選定上の未確定（引き継ぎ）

未確定事項:

- `pg_cron` と Edge 通知トリガーの具体方式

---

## 11. テスト方針（技術）

| 対象 | MVP | Phase 2 |
| --- | --- | --- |
| 入札 RPC・wallet 整合 | 重点（Vitest / SQL テスト） | |
| 他グループ拒否（RLS） | 最低限の自動 or 手動手順を PR に残す | pgTAP 拡充 |
| UI | Testing Library | テストケース拡充 |
| Auth / Realtime | 手動シナリオ可 | 自動化検討 |

危険領域（Auth / RLS / Wallet / 入札）は PR に検証手順を残す（`AGENTS.md` DoD）。

---

## 12. オープンイシュー（技術）

| ID | 内容 | 依存 |
| --- | --- | --- |
| T1 | P1–P7, P9–P12 の定数の置き場（グローバル / グループ設定） | PRD §6 |
| T2 | 落札確定の時計（`pg_cron` 間隔、クライアント表示とのズレ） | §10.3 |
| T3 | 無料 AI の具体プロバイダとフォールバック | PRD AI 方針 |
| T4 | ミニゲーム「器」のテーブル粒度（中身未定のままどこまで作るか） | PRD B5 |
| T5 | 本番で有効化する Auth provider の確定 | §4 |
| T6 | 入札一覧の匿名化を DB でやるか API でやるか | 情報非対称 |

---

## 13. 改訂履歴

| 日付 | 内容 |
| --- | --- |
| 2026-08-14 | 環境構築の選定をVite + Biome、Cloudflare Workers Static Assetsへ更新 |
| 2026-08-14 | 初版。技術選定は参照のまま分離。Auth 広め / Realtime 広め / エスクローなし入札 / 自出品入札拒否 / マイナス残高許可＋入札は残高チェック / 条件付き AI validation を反映 |

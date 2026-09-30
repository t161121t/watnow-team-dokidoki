# features/

ドメイン単位（`auth` / `groups` / `secrets` / `auctions` / `wallet` / `challenges` / `users`）でコードを分ける。詳細は [`docs/アーキテクチャ.md`](../docs/アーキテクチャ.md)。

`auth`のみDB.mdのテーブル区分に対応しない横断的なドメイン（サインイン/サインアウト、オンボーディングでのプロフィール作成）。他ドメインと同じ3層構成に揃えている。

各ドメインの中身は共通の3層:

```
features/<domain>/
  components/   UIコンポーネント（Server/Client Component）。読み取りはserver/を直接呼ぶ
  actions.ts    Server Actions。書き込み（mutation）用。入力バリデーション（Zod）+ server/ の呼び出しだけ
  server/       Prisma / RPC 呼び出し本体。lib/db・lib/prisma を import してよいのはここだけ
  types.ts      このドメインの型（任意）
  constants.ts  このドメイン固有の定数（任意。例: features/auctions/constants.ts）
```

読み取り専用のドメイン（例: `wallet`）は、書き込みが無ければ`actions.ts`が無くてもよい。

ドメイン固有のルール・定数（按分比率など）は `lib/` に置かない（`lib/README.md`参照）。そのドメインの `constants.ts` に置く。

## ドメインごとの現状

| ドメイン | `components/` | `actions.ts` | `server/` | README | 備考 |
| --- | --- | --- | --- | --- | --- |
| `auth` | ✅ | ✅ | ✅ | ✅ | 横断ドメイン。サインイン・オンボーディング |
| `groups` | ✅ | ✅ | ✅ | ✅ | 招待URL・メンバー管理を含む |
| `secrets` | ✅ | ✅ | ✅ | ✅ | |
| `auctions` | ✅ | ✅ | ✅ | ✅ | |
| `challenges` | ✅ | ✅ | ✅ | ✅ | |
| `wallet` | ✅ | — | ✅ | ✅ | 読み取り専用。書き込みは他ドメインの RPC 経由（ポイントの増減は `common/002` の内部関数） |
| `users` | ✅ | — | — | ✅ | 画面だけ（プロフィール・アカウント設定）。更新は `auth/actions.ts`（`updateProfile` `updateEmail` `updatePassword` `signOut`）を呼ぶ |

## ドメイン直下に置いてよいファイル

`components/` `server/` `actions.ts` 以外は、そのドメイン内で共有する**純粋な値・型・関数**だけを直下に置く（DB・Next.js・Supabase に依存しないもの。ESLint 上は `feature-shared`）。

| ファイル | 用途 | 例 |
| --- | --- | --- |
| `types.ts` | ドメインの型 | `features/groups/types.ts` |
| `constants.ts` | ドメイン固有の定数（按分比など。`lib/` に置かない） | `features/auctions/constants.ts` |
| `<用途>.ts` | 表示用の整形や判定などの純粋関数、タブ定義（`*-tab.ts`）、バリデーションスキーマ | `format.ts` `cooldown.ts` `secret-list-tab.ts` `validation.ts` |

複数ドメインで使う汎用ヘルパーは `lib/` へ（例: アバター表示は `lib/avatar.ts`）。同じ関数をドメインごとにコピーしない。

## `server/` のファイル名

- 1ファイル1関数、`<動詞>-<対象>.ts`（kebab-case）
- 取得は `get-` で始める（新規はこれに統一）。既存の `list-*.ts`（`list-my-secrets` `list-my-winnings` `list-secret-for-auction` `list-group-members`）は改名しない
- 書き込みは RPC 名に合わせる（例: `place-bid.ts` ↔ `place_bid`、`decline-dealer.ts` ↔ `decline_dealer`）

## 依存の向き（ESLintで強制。`eslint.config.mjs` の boundaries 設定参照）

```
app/  ─→  features/<domain>/components, features/<domain>/actions.ts
                     │                        │
                     ├──────────┐              ▼
                     ▼          ▼      features/<domain>/server/
        components/, lib/(汎用) │              │
                                 └──────────────┤
                                                 ▼
                                       lib/db/, lib/prisma.ts
```

`features/<domain>/components`から`features/<domain>/server/`への矢印は読み取り専用（2026-08-20方針変更。RSCは最初からサーバー上でしか動かないため、`actions.ts`のクライアント境界越えの仕組みは読み取りには不要。詳細は`docs/アーキテクチャ.md` §1.1a）。書き込みは引き続き`actions.ts`を経由すること。

## 禁止事項

- `features/<A>/components` から `features/<B>/*` を import しない（ドメイン間の直接依存を作らない）
- `features/<domain>/components` から `features/<domain>/server/*` への直接 import は**読み取り専用**にする（書き込みは `actions.ts` を経由する）。ESLintは読み取り/書き込みを区別できないため、この使い分けはコードレビューで担保する
- `features/<domain>/server` 以外から `@/lib/prisma` `@/lib/db/*` を import しない
- ドメインをまたぐ処理（例: 落札確定で wallet と secrets の両方を更新する）は、アプリコードで2ドメインの server を両方呼ぶのではなく、**PostgreSQL Function 側でまとめる**（`prisma/sql/<domain>/`）。詳細は `AGENTS.md`「実装の置き場所」

# features/

ドメイン単位（`auth` / `groups` / `secrets` / `auctions` / `wallet` / `challenges`）でコードを分ける。詳細は [`docs/アーキテクチャ.md`](../docs/アーキテクチャ.md)。

`auth`のみDB.mdのテーブル区分に対応しない横断的なドメイン（サインイン/サインアウト、オンボーディングでのプロフィール作成）。他ドメインと同じ3層構成に揃えている。

各ドメインの中身は共通の3層:

```
features/<domain>/
  components/   UIコンポーネント（Server/Client Component）
  actions.ts    Server Actions。入力バリデーション（Zod）+ server/ の呼び出しだけ
  server/       Prisma / RPC 呼び出し本体。lib/db・lib/prisma を import してよいのはここだけ
  types.ts      このドメインの型（任意）
  constants.ts  このドメイン固有の定数（任意。例: features/auctions/constants.ts）
```

ドメイン固有のルール・定数（按分比率など）は `lib/` に置かない（`lib/README.md`参照）。そのドメインの `constants.ts` に置く。

## 依存の向き（ESLintで強制。`eslint.config.mjs` の boundaries 設定参照）

```
app/  ─→  features/<domain>/components, features/<domain>/actions.ts
                     │                        │
                     ▼                        ▼
        components/, lib/(汎用)      features/<domain>/server/
                                              │
                                              ▼
                                    lib/db/, lib/prisma.ts
```

## 禁止事項

- `features/<A>/components` から `features/<B>/*` を import しない（ドメイン間の直接依存を作らない）
- `features/<domain>/components` から `features/<domain>/server/*` を直接 import しない（`actions.ts` を必ず経由する）
- `features/<domain>/server` 以外から `@/lib/prisma` `@/lib/db/*` を import しない
- ドメインをまたぐ処理（例: 落札確定で wallet と secrets の両方を更新する）は、アプリコードで2ドメインの server を両方呼ぶのではなく、**PostgreSQL Function 側でまとめる**（`prisma/sql/<domain>/`）。詳細は `AGENTS.md`「実装の置き場所」

# watnow-team-dokidoki

秘密オークション（仮）— 友達グループ向けコミュニケーションゲーム。PWA + Supabase。

## ドキュメント

| パス | 内容 |
| --- | --- |
| [AGENTS.md](./AGENTS.md) | AI 向け正本（手順・制約・DoD） |
| [CLAUDE.md](./CLAUDE.md) | Claude Code 入口（正本へ誘導） |
| [.github/copilot-instructions.md](./.github/copilot-instructions.md) | Copilot 入口（正本へ誘導） |
| [.cursor/rules/](./.cursor/rules/) | Cursor 常時規則 |
| [.agents/skills/](./.agents/skills/) | スキル正本（`.cursor` / `.claude` は symlink） |
| [docs/ai-development.md](./docs/ai-development.md) | AI 駆動の開発フロー |
| [docs/概要まとめる.md](./docs/概要まとめる.md) | コンセプト |
| [docs/機能要件.md](./docs/機能要件.md) | 機能要件 |
| [docs/技術選定.md](./docs/技術選定.md) | 技術選定 |
| [docs/画面.md](./docs/画面.md) / [docs/ユーザーフロー .md](./docs/ユーザーフロー%20.md) | 画面・導線 |

## セットアップ

前提: Node.js（`@types/node` は v20 系を想定）、npm。

1. リポジトリを clone する
2. `.env.example` を `.env` にコピーする
   ```bash
   cp .env.example .env
   ```
3. `.env` の `DATABASE_URL` を埋める
   - Supabase の実 DB に繋ぐ場合: Supabase ダッシュボード → **Project Settings → Database → Connection string** から接続文字列を取得し、パスワード部分を実際の DB パスワードに置き換える
     - `sslmode=require&uselibpqcompat=true` を付けること（`pg` の新しいデフォルトだと `require` が証明書検証ありの `verify-full` 扱いになり、Supabase の証明書で失敗するため）
     - DB パスワードが分からない場合は Supabase ダッシュボードでリセットが必要（既存の接続は切れる点に注意）
   - ローカルだけで試したい場合: `.env.example` 内のコメントにある `prisma dev` 用のローカル接続文字列を使う（`npm run db:dev` でローカル Postgres を起動）
4. 依存インストール〜DB 接続確認をまとめて実行する
   ```bash
   npm run setup
   ```
   - 内部で `npm install`（`postinstall` フックで Prisma Client も自動生成）→ `npm run db:check`（`DATABASE_URL` への疎通確認）を実行する
   - `✔ Database connection OK` が出れば完了。失敗したら `.env` の `DATABASE_URL` を見直す
5. 開発サーバーを起動する
   ```bash
   npm run dev
   ```

その他の DB 関連コマンド（マイグレーション作成、Prisma Studio など）は [AGENTS.md の「コマンド」](./AGENTS.md#コマンド) を参照。

`.env` は Git 管理外（`.gitignore`）。DB パスワードなどの秘密情報は Slack 等の別チャネルで共有し、コミットしないこと。

## 開発の始め方（概要）

1. Issue を作成する（`.github/ISSUE_TEMPLATE/`）
2. `AGENTS.md` と関連 docs を読む
3. feature ブランチで実装する
4. PR テンプレ（`.github/pull_request_template.md`）を埋めて出す

詳細は [docs/ai-development.md](./docs/ai-development.md) を参照。

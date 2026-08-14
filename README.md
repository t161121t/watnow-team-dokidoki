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

## 必要環境

| ツール | バージョン・用途 |
| --- | --- |
| Node.js | 24 LTS（`.node-version`） |
| pnpm | 11.21.0（`package.json`で固定） |
| Docker互換ランタイム | Supabaseローカル環境専用。Docker Desktop / OrbStack等 |

フロントエンドはホスト上でViteを実行する。独自のDockerfileやComposeは使用せず、Supabase CLIが必要なコンテナを管理する。全サービスの起動には7GB以上の空きメモリを推奨する。

## 初回セットアップ

```bash
pnpm env:check
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm supabase:start
pnpm supabase:status
```

Docker互換ランタイムを起動してから`pnpm supabase:start`を実行する。Windows PowerShellでは`cp`の代わりに`Copy-Item .env.example .env.local`を使う。`supabase:status`に表示されたローカルURLとanon keyを`.env.local`へ設定してから、`pnpm dev`を実行する。ローカルSupabaseは外部公開しない。

## 開発コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm dev` | Vite開発サーバー |
| `pnpm check` / `pnpm check:write` | Biomeによる検査 / 自動修正 |
| `pnpm typecheck` | TypeScript型チェック |
| `pnpm test` | Vitest |
| `pnpm build` | 本番ビルド |
| `pnpm verify` | check、typecheck、test、buildを一括実行 |
| `pnpm ui:add <component>` | shadcn/ui（Base UI）のコンポーネントを追加 |
| `pnpm supabase:start` / `pnpm supabase:stop` | ローカルSupabaseの起動 / 停止 |
| `pnpm supabase:reset` | ローカルDBをmigrationとseedから再構築 |
| `pnpm supabase:types` | ローカルDBからTypeScript型を生成 |

依存関係はpnpmだけで変更し、lockfileを更新する。DB変更はDashboardだけで済ませず、migrationとして共有する。秘密情報と`.env.local`はコミットしない。

## 開発の始め方（概要）

1. Issue を作成する（`.github/ISSUE_TEMPLATE/`）
2. `AGENTS.md` と関連 docs を読む
3. feature ブランチで実装する
4. PR テンプレ（`.github/pull_request_template.md`）を埋めて出す

詳細は [docs/ai-development.md](./docs/ai-development.md) を参照。

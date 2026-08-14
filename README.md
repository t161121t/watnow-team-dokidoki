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
| [docs/環境構築手順.md](./docs/環境構築手順.md) | Windows / macOS 向けの環境構築手順 |
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
| Deno | 2.9.5（`.dvmrc`、Edge Functionsの検査） |
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
| `pnpm test:e2e` | PlaywrightによるChromium / WebKit E2E・アクセシビリティ検査 |
| `pnpm build` | 本番ビルド |
| `pnpm edge:fmt` | Edge FunctionsをDenoで整形 |
| `pnpm verify:web` | Frontendのcheck、typecheck、test、buildを一括実行 |
| `pnpm verify:edge` | Edge Functionsのfmt、lint、型、testを一括検査 |
| `pnpm verify` | FrontendとEdge Functionsを一括検査 |
| `pnpm ui:add <component>` | shadcn/ui（Base UI）のコンポーネントを追加 |
| `pnpm supabase:start` / `pnpm supabase:stop` | ローカルSupabaseの起動 / 停止 |
| `pnpm supabase:reset` | ローカルDBをmigrationとseedから再構築 |
| `pnpm supabase:types` | ローカルDBからTypeScript型を生成 |

`pnpm test:e2e`の初回実行前に`pnpm exec playwright install chromium webkit`でブラウザを導入する。E2E実行中だけ、本番ビルドを配信するローカルpreviewサーバーが自動起動する。

`edge-smoke`はEdge Functionsの認証付き実行基盤とDeno検査を保つための最小Functionで、DB更新・外部HTTP・本番Secretsは使用しない。デプロイはこのリポジトリの通常検証には含めない。

依存関係はpnpmだけで変更し、lockfileを更新する。DB変更はDashboardだけで済ませず、migrationとして共有する。秘密情報と`.env.local`はコミットしない。

VS Code / Cursorでは、リポジトリを開いたときに表示される推奨拡張機能を導入する。`pnpm install`でLefthookが設定され、コミット時にステージ済みの対応ファイルへBiomeの安全な自動修正を適用する。

## 開発の始め方（概要）

1. Issue を作成する（`.github/ISSUE_TEMPLATE/`）
2. `AGENTS.md` と関連 docs を読む
3. feature ブランチで実装する
4. PR テンプレ（`.github/pull_request_template.md`）を埋めて出す

詳細は [docs/ai-development.md](./docs/ai-development.md) を参照。

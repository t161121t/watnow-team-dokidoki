# AGENTS.md

このリポジトリは **AI 駆動開発**を前提とする。人間は仕様判断・レビュー・マージに責任を持ち、実装の大部分を AI に委任してよい。

**正本はこのファイル。** ツール別ファイルは入口のみとし、手順・制約・DoD はここに集約する（複製禁止）。

## 対応ツールと入口

| ツール | 入口 | 備考 |
| --- | --- | --- |
| 共通（正本） | `AGENTS.md`（本ファイル） | 仕様・制約・DoD |
| Cursor | `.cursor/rules/*.mdc` | 常時適用の短い規則 |
| Claude Code | `CLAUDE.md` | 本ファイルへ誘導 |
| GitHub Copilot | `.github/copilot-instructions.md` | 本ファイルへ誘導 |

### スキル（三重配置・正本は1つ）

| パス | 役割 |
| --- | --- |
| `.agents/skills/*/SKILL.md` | **正本**（ここだけ編集） |
| `.cursor/skills/*` | `.agents/skills/*` への symlink |
| `.claude/skills/*` | `.agents/skills/*` への symlink |
| `.claude/commands/` | Claude Code スラッシュコマンド（正本へ誘導） |
| `.github/prompts/` | Copilot プロンプト（正本へ誘導） |

現在: `create-pr`（「PR作成」「PR作って」「PRお願い」で起動）

詳細フロー: `docs/ai-development.md`

## 最初に読むもの

1. `docs/概要まとめる.md`
2. `docs/オークションルール.md`（オークション周りの現行コンセプト）
3. `docs/コンセプト変更まとめ.md`（変更・残置・廃止の索引）
4. `docs/機能要件.md`
5. `docs/技術選定.md`
6. `docs/画面.md` / `docs/ユーザーフロー .md`
7. `docs/ai-development.md`

## スタック（要約）

- Frontend: React 19, TypeScript, Vite, TanStack Router/Query, RHF, Zod, Tailwind, shadcn/ui, PWA
- Backend: Supabase（Auth / Postgres / RLS / Realtime / Storage / Edge Functions）
- 配置: 複数テーブル整合 → PostgreSQL Function / 外部 I/O → Edge Functions

## やってよいこと / だめなこと

| やってよい | だめ |
| --- | --- |
| Issue / docs に沿った小さな実装 | 仕様の独断変更 |
| 既存パターンに沿った修正・テスト追加 | スコープ外リファクタの混入 |
| 不明点を質問・仮定の明示 | 秘密情報のコミット |
| PR テンプレに沿った説明 | 巨大な無関係差分の一括 PR |

## 実装の置き場所（方針）

- UI / クライアント状態: Frontend（React）
- 複数テーブルの整合・入札・ポイント: PostgreSQL Function
- 外部 HTTP / Storage 連携: Edge Functions
- アクセス制御: RLS（必須）+ Function 内チェック
- **不変条件**: グループ完全分離（他グループデータ漏れは致命傷）

## Git / PR

- 作業は feature ブランチ（例: `feat/…`, `fix/…`, `chore/…`）。大きな実装の `main` 直 push は避ける
- push 前に `pnpm verify` を実行する
- `main` 向け PR は作成時・再オープン時・追加 push 時に CI を実行する
- CI の `verify` 成功、承認1件、会話の解決、`main` の最新化を満たしてからマージする
- PR は `.github/pull_request_template.md` を埋め、**AI usage** にツール名と人間レビュー範囲を書く
- 1 PR = 1 目的。レビュー15〜30分を目安

## Definition of Done

- [ ] 変更目的が1つに絞れている
- [ ] docs / Issue と矛盾しない（仕様変更なら docs も更新）
- [ ] `.github/pull_request_template.md` を埋めた
- [ ] 危険領域（Auth / RLS / Wallet / 入札）を確認した（該当時）
- [ ] 秘密ファイル（`.env` 等）をステージしていない
- [ ] 導入済みなら lint / typecheck / test を実行し、結果を PR に書いた（未導入なら「未導入」と明記）

## コマンド

| コマンド | 用途 |
| --- | --- |
| `pnpm env:check` | Node.js・pnpm・Deno・Docker CLIの前提確認 |
| `pnpm dev` | Vite開発サーバー |
| `pnpm check` | BiomeによるLint / Format検査 |
| `pnpm typecheck` | TypeScript型チェック |
| `pnpm test` | Vitest |
| `pnpm build` | 本番ビルド |
| `pnpm edge:fmt` | Edge FunctionsのDeno format |
| `pnpm verify:web` | Frontendのcheck / typecheck / test / buildの一括確認 |
| `pnpm verify:edge` | Edge FunctionsのDeno fmt / lint / check / test |
| `pnpm verify:db` | 起動済みのローカルDBに対してpgTAPテストを実行 |
| `pnpm verify` | Frontend / Edge Functions / DB検査の一括確認 |
| `pnpm ui:add <component>` | shadcn/ui（Base UI）のコンポーネント追加 |
| `pnpm supabase:start` / `pnpm supabase:stop` | Docker上のローカルSupabase起動 / 停止 |
| `pnpm supabase:reset` | migrationとseedからローカルDBを再構築 |
| `pnpm supabase:types` | ローカルDBからTypeScript型を生成 |

パッケージ管理はpnpmに統一する。Supabaseのスキーマ変更はmigrationに残し、生成型を更新する。

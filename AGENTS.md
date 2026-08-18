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
7. `docs/DB.md`（DB設計）
8. `docs/アーキテクチャ.md`（アプリのディレクトリ構成・レイヤー・RLSの守り方。コードを書く前に必読）
9. `docs/ai-development.md`

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

- UI / クライアント状態: Frontend（React、`app/` + `features/*/components`）
- DBアクセス（read/write・RPC呼び出し）: Prisma Client を `lib/db/rls.ts` の `withRlsContext` 経由でのみ使う（`features/*/server/*`）。直接 `@/lib/prisma` を import しない
- 複数テーブルの整合・入札・ポイント: PostgreSQL Function（`prisma/sql/<domain>/`）
- 外部 HTTP / Storage 連携: Edge Functions
- アクセス制御: RLS（必須）+ Function 内チェック + `withRlsContext`（Prisma接続でRLSを効かせる。§実装の詳細は `docs/アーキテクチャ.md`）
- **不変条件**: グループ完全分離（他グループデータ漏れは致命傷）

具体的なディレクトリ構成・何を書いてよいか/だめかは `docs/アーキテクチャ.md` と各ディレクトリの `README.md`（`features/README.md` 等）が正。違反は `npm run lint`（ESLint boundaries）で検出される。

## Git / PR

- 作業は feature ブランチ（例: `feat/…`, `fix/…`, `chore/…`）。大きな実装の `main` 直 push は避ける
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

初回セットアップ・DB 接続確認は [README.md](./README.md#セットアップ) を参照。

| コマンド | 内容 |
| --- | --- |
| `npm run setup` | `npm install` + Prisma Client 生成（`postinstall`）+ DB 接続確認（`db:check`） |
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | 本番ビルド |
| `npm run lint` | ESLint |
| `npm run typecheck` | `next typegen`（ルート型生成）+ `tsc --noEmit` |
| `npm run db:dev` | ローカル Prisma Postgres を起動（Supabase に繋がない場合の代替） |
| `npm run db:generate` | Prisma Client を再生成（スキーマ変更後に実行） |
| `npm run db:migrate` | `prisma migrate dev`（マイグレーション作成・適用） |
| `npm run db:studio` | Prisma Studio（DB の中身をブラウザで確認） |
| `npm run db:check` | `DATABASE_URL` への疎通確認のみ実行 |
| `npm run db:sql` | `prisma/sql/**/*.sql`（PostgreSQL Functions・RLSポリシー）を適用 |
| `npm run db:setup` | `prisma migrate deploy` + `db:sql` をまとめて実行 |
| `npm run verify:auth` | `create_profile` RPCが実DBで正しく動くかを検証（Magic Linkのメール往復は対象外） |
| `npm run verify:storage` | `avatars`バケットのRLSが実DBで正しく効くかを検証（実際のアップロードAPI呼び出しは対象外） |
| `npm run verify:groups` | groupsドメインのRPC（search_users/decline_invite/leave_group等・最後のadminガード）を実DBで検証 |
| `npm run verify:rls` | `withRlsContext` がRLSを正しく効かせるかを実DBで検証（テストユーザーを作成・削除） |
| `npm run verify:auction` | 出品〜入札〜落札確定（次点繰り上げ含む）を実DBで通しで検証 |

lint / typecheck（`npm run typecheck`）/ build は導入済み。test は未導入。PR作成時に `.github/workflows/ci.yml` で lint / typecheck / build を自動実行する（テストフレームワーク未導入のため test は含まない。導入判断は `docs/技術選定.md` §5 参照）。

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

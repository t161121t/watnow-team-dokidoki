# Copilot Instructions

GitHub Copilot 向け入口。**プロジェクトの正本は `AGENTS.md`。** 作業前に必ず読むこと。

このファイルに手順・制約・DoD を複製しない。変更は `AGENTS.md`（および必要なら `.cursor/rules/`）だけを更新する。

## 必読

1. `AGENTS.md`
2. 関連する `docs/`（機能要件・画面・技術選定）
3. `docs/ai-development.md`

## 優先して従うこと

- Issue / docs のスコープを超えない
- グループ完全分離（RLS + Function 内チェック）を壊さない
- 秘密情報をコミットしない
- PR 作成時は `.github/pull_request_template.md` の構成を変えずに埋める

## 「PR作成」系の依頼

ユーザーが次のような表現を使ったら、`.agents/skills/create-pr/SKILL.md`（または `.github/prompts/create-pr.prompt.md`）に従い、コミット → プッシュ → PR 作成までを一貫して進める（force push 禁止）。

- PR作成 / PR作って / PRお願い

## スキル

- 正本: `.agents/skills/`
- Copilot 向けプロンプト: `.github/prompts/`

## 参照

- Claude Code 入口: `CLAUDE.md`
- Cursor 規則: `.cursor/rules/`

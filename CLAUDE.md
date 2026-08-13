# CLAUDE.md

Claude Code 向け入口。**プロジェクトの正本は `AGENTS.md`。** 作業前に必ず読むこと。

このファイルに手順・制約・DoD を複製しない。変更は `AGENTS.md`（および必要なら `.cursor/rules/`）だけを更新する。

## 必読

1. `AGENTS.md`
2. 関連する `docs/`（機能要件・画面・技術選定）
3. `docs/ai-development.md`

## Claude Code での進め方

- Issue / ユーザー指示のスコープを超えない
- 仕様が曖昧なら質問するか、仮定を PR / コメントに明示する
- コミット・PR 作成を頼まれたら `/create-pr` または `.agents/skills/create-pr/SKILL.md` に従う
- Auth / RLS / Wallet / 入札を触る変更は、検証手順を必ず残す

## スキル

- 正本: `.agents/skills/`
- このツール向け: `.claude/skills/`（symlink） / `.claude/commands/`

## 参照

- Cursor 規則: `.cursor/rules/`
- Copilot 入口: `.github/copilot-instructions.md`

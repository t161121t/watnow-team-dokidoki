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

## 開発の始め方（概要）

1. Issue を作成する（`.github/ISSUE_TEMPLATE/`）
2. `AGENTS.md` と関連 docs を読む
3. feature ブランチで実装する
4. PR テンプレ（`.github/pull_request_template.md`）を埋めて出す

詳細は [docs/ai-development.md](./docs/ai-development.md) を参照。

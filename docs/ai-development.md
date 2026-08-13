# AI 駆動開発フロー

ステータス: 運用開始

## 役割分担

| 役割 | 担当 |
| --- | --- |
| 仕様の正 | `docs/`（特に機能要件・画面・技術選定） |
| エージェント向け正本 | `AGENTS.md`（手順・制約・DoD。複製禁止） |
| 実装 | AI + 人間（ペア） |
| レビュー / マージ判断 | 人間（必須） |
| リリース判断 | チーム合意 |

AI は高速な下書き担当。**マージ責任は人間**。

## ツール別入口（中身は複製しない）

| ツール | 入口 | 正本 |
| --- | --- | --- |
| 共通 | `AGENTS.md` | ← ここだけ厚く書く |
| Cursor | `.cursor/rules/*.mdc` | 短い常時規則。詳細は AGENTS |
| Claude Code | `CLAUDE.md` | AGENTS への誘導のみ |
| GitHub Copilot | `.github/copilot-instructions.md` | AGENTS への誘導のみ |

ルールや手順を変えるときは **必ず `AGENTS.md`（必要なら `.cursor/rules`）だけ更新**する。`CLAUDE.md` / `copilot-instructions.md` に本文を増やさない。

## スキルの三重配置

| パス | 役割 |
| --- | --- |
| `.agents/skills/<name>/` | **正本**（編集はここだけ） |
| `.cursor/skills/<name>` | `.agents` への symlink |
| `.claude/skills/<name>` | `.agents` への symlink |
| `.claude/commands/<name>.md` | Claude コマンド（正本へ誘導） |
| `.github/prompts/<name>.prompt.md` | Copilot プロンプト（正本へ誘導） |

新規スキルを足すとき:

1. `.agents/skills/<name>/SKILL.md` を作る
2. `.cursor/skills/<name>` と `.claude/skills/<name>` を symlink する
3. 必要なら Claude command / Copilot prompt を薄い誘導ファイルとして追加

コピーで三重管理しない（すぐズレる）。

## 推奨フロー

```text
1. Issue を切る（Feature / Bug テンプレ）
2. 関連 docs を更新する（仕様変更がある場合はコードより先）
3. feature ブランチを切る
4. Cursor / Claude Code / Copilot で実装（AGENTS.md に従う）
5. ローカルで動作確認
6. PR 作成（テンプレ必須。AI usage にツール名を記入）
7. 人間レビュー → 修正 → マージ
```

## Issue の粒度

- 1 Issue ≈ 半日〜1日でレビュー可能な単位
- 「オークション全部」ではなく「入札 RPC」「出品フォーム」など成果物が明確なもの
- AI 向けメモ欄に「触ってよいパス / 触るな」を書けると手戻りが減る

## PR の粒度

- 目安: レビューが15〜30分で終わる差分
- AI が大きな差分を出したら、人間が分割して出すか、PR 本文で章立てする
- `main` への直 push での機能追加は避ける（テンプレ整備コミット等の例外を除く）

## レビューで必ず見るもの

1. **正しさ**: docs の要件・画面と一致しているか
2. **安全**: グループ分離・RLS・認証まわり
3. **範囲**: 依頼外の変更が混ざっていないか
4. **再現**: Test plan が実行可能か / 実行済みか

## AI usage の書き方（例）

```markdown
- Tool: Cursor Agent / Claude Code / Copilot
- Human review: 入札 RPC と RLS ポリシーを通読。UI は動作確認のみ
- Prompt / notes: docs/機能要件 の入札章に沿って RPC を追加
```

## 仕様変更の扱い

コードだけ先に変えない。

1. docs を更新（または Issue で合意）
2. 実装 PR で docs とコードを揃える  
   または docs PR → 実装 PR の順

## これからコードが増えたら追加するもの

- Frontend / Supabase 向けの短い Cursor rule（詳細は AGENTS に書かない重複を避ける）
- `AGENTS.md` のコマンド欄（`npm run …` 等）
- CI（typecheck / test）とブランチ保護

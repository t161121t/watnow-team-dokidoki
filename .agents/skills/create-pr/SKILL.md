---
name: create-pr
description: >-
  コミット、プッシュ、PR作成までを一括実行する。CI がある場合は失敗時の自動修正も行う。
  ユーザーが「PR作成」「PR作って」「PRお願い」と言ったとき、または create-pr 指定時に使う。
---

# PR作成スキル

変更からコミット → プッシュ → PR 作成までを一貫して行う。  
正本の制約は `AGENTS.md`。PR 本文は `.github/pull_request_template.md` の構成を変えない。

## 引数

| 引数 | 意味 |
| --- | --- |
| `--issue <番号>` | Issue 紐付け（タイトル・ラベルからブランチ名も生成） |
| `--wait` | CI 待機と失敗時の自動修正（導入済みのとき） |

各 Step 完了時は `[Step N] <要約>` で報告する。

## ワークフロー

### Step 1: 状態確認

```bash
git status
git diff
git diff --staged
git branch -vv
git log -5 --oneline
```

- コミットする変更が無ければ終了
- 秘密ファイル（`.env` 等）が含まれていたら mon して除外

### Step 2: 品質チェック（導入済みなら）

- `package.json` に script があるものだけ実行（例: `lint`, `format:check`, `test`, `typecheck`）
- 未導入なら `[Step 2] 品質チェック: 未導入のためスキップ` と記録し、PR のテスト欄にも「未導入」と書く
- 失敗したら修正してから先へ進む

### Step 3: ブランチ

- 現在が `main`（またはデフォルトブランチ）なら feature ブランチを新規作成
- 既に feature ブランチなら再利用
- `--issue` 指定時は `gh issue view <番号>` でタイトル/ラベルを取得

プレフィックス:

- `bug` → `fix/`
- `enhancement` → `feat/`
- `docs` → `docs/`
- それ以外 → `chore/`

例: `feat/auction-bid`, `fix/rls-wallets`

### Step 4: コミット

- 関連ファイルだけ `git add`
- メッセージは **なぜ**が分かる1〜2文（日本語または英語）
- HEREDOC で渡す
- `--amend` / `--no-verify` はユーザー指示がない限り禁止
- pre-commit 失敗時は修正して **新しいコミット**（amend しない）

### Step 5: プッシュ

```bash
git push -u origin HEAD
```

- `--force` / `--force-with-lease` は禁止
- non-fast-forward なら `git pull --rebase origin <base>` を案内してから再 push

### Step 6: PR作成

1. `.github/pull_request_template.md` を読む
2. 差分に基づき全セクションを埋める（目的 / 方針 / AI usage / テストは必須）
3. `AI usage` の Tool に実際に使ったエージェントを書く
4. base はリポジトリのデフォルトブランチ（現状 `main`）

```bash
gh pr create --base main --title "<タイトル>" --body "$(cat <<'EOF'
…テンプレに沿った本文…
EOF
)"
```

Issue がある場合:

- 完了見込みなら本文に `Closes #<n>`
- 一部なら `Refs #<n>`
- 必要なら `gh issue comment` で PR URL を通知

### Step 7: CI（ある場合のみ）

```bash
gh pr checks --watch --fail-fast
```

- workflow が無ければスキップ
- 失敗時はログを見て自動修正できるもの（format / lint / type）を直し、再 push（最大3回）
- 判断やデザイン確認が必要な失敗は手動対応を案内して終了

### Step 8: `--wait`（任意）

- レビューコメントを監視し、明確な修正指示だけ反映して再 push
- 仕様判断が必要な指摘は人間に渡して終了
- 自動修正は最大3回

## 完了時の出力

- PR URL
- 実施した Step の要約
- スキップしたチェックとその理由

## 参照

- `AGENTS.md`
- `.github/pull_request_template.md`
- `docs/ai-development.md`

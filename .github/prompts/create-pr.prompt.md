---
mode: agent
description: コミット、プッシュ、PR作成を一括実行する（必要に応じて --wait）。
---

# create-pr

`.agents/skills/create-pr/SKILL.md` を参照し、順番に実行してください。

1. git 状態確認（秘密ファイル除外）
2. 導入済みなら品質チェック
3. ブランチ作成
4. コミット
5. プッシュ（force 禁止）
6. PR作成（`.github/pull_request_template.md` 準拠、Issue 紐付け）
7. CI があれば待機・失敗時自動修正（最大3回）
8. `--wait` 指定時はレビュー指摘の反映

起動例:

- `PR作成`
- `PR作って`
- `PRお願い`
- `create-pr --issue 123 --wait`

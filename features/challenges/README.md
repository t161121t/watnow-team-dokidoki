# features/challenges

チャレンジ（写真提出→他メンバーが単一承認→ポイント付与）と、幹事によるグループ独自チャレンジの作成を実装済み。

- 画面: `app/groups/[groupId]/challenges/`（一覧 / 承認待ちタブ / 詳細 / 提出 / 作成）
- RPC: `prisma/sql/challenges/`（`submit_challenge` / `approve_challenge` / `create_group_challenge`）
- 検証: `npm run verify:challenges`
- 未実装: システム共通チャレンジの中身、獲得上限

実装パターンは `features/wallet/`(actions.ts → server/ → lib/db/rls.ts)に揃えている。
詳細な責務分担は [`docs/アーキテクチャ.md`](../../docs/アーキテクチャ.md) を参照。

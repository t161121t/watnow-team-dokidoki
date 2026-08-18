# features/groups

`actions.ts`に`createGroupIconUploadUrl`のみ実装済み（issue #37。Storage連携）。
グループ作成・招待等の本体（`create_group`等のRPC呼び出し、`server/`）は未実装
（issue #38）。実装パターンは `features/wallet/`(actions.ts → server/ → lib/db/rls.ts)
を参照して揃えること。詳細な責務分担は [`docs/アーキテクチャ.md`](../../docs/アーキテクチャ.md) を参照。

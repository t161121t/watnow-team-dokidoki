# components/

**ドメインに依存しない**、汎用UIコンポーネントのみを置く（ボタン、モーダル、カード等。将来 shadcn/ui を入れるならここ）。

## 禁止事項

- 特定ドメイン（オークション・秘密・チャレンジ等）の語彙が名前や中身に出てくるコンポーネントを置かない → それは `features/<domain>/components/` に置く
- `@/lib/prisma`・`@/lib/db/*` の import禁止（データを持たない、受け取った props を表示するだけにする）
- `features/*` の import禁止（依存が逆転する）

# lib/

ドメインに依存しない横断的なインフラコード。詳細は [`docs/アーキテクチャ.md`](../docs/アーキテクチャ.md)。

| パス | 責務 | import してよい場所 |
| --- | --- | --- |
| `lib/prisma.ts` | Prisma Client シングルトン | `lib/db/*` のみ |
| `lib/db/rls.ts` | RLSを効かせた状態でPrismaを呼ぶための唯一の入口(`withRlsContext` 等) | `features/*/server/*` のみ |
| `lib/supabase/server.ts` | Auth セッション確認・Storage・Realtime 用の Supabase クライアント。**テーブルの select/insert/rpc には使わない** | `features/*/actions.ts`（ユーザーID取得のため）、Storage/Realtimeを直接使う箇所 |
| `lib/supabase/proxy.ts` | `proxy.ts`（Next.js 16でのmiddleware後継。旧middleware.ts）専用のセッションリフレッシュ（`updateSession`）。`server.ts`は`next/headers`の`cookies()`に依存するためproxyでは使えず、別実装にしている | ルート直下の `proxy.ts` のみ |
| `lib/supabase/storage.ts` | `avatars`バケットへの署名付きアップロードURL発行（`createAvatarUploadUrl`）。user avatar / group icon 共用で、どちらの用途かはここでは判断しない。認証確認は持たない（呼び出し元の`actions.ts`が行う） | `features/*/actions.ts` |

## 禁止事項

- `lib/prisma.ts` を `features/*/server/*` 以外から import しない（`app/`・`components/`・`features/*/components` から直接 Prisma を叩かない）
- `lib/supabase/server.ts` の Supabase クライアントで `.from()` / `.rpc()` を呼ばない（RLSを保証する経路が `lib/db/rls.ts` の外に生まれてしまう）。Auth・Storage・Realtime 用途のみ
- 新しい汎用ヘルパーを増やすときも、ドメイン固有のロジック（按分計算・入札ルールなど）をここに書かない。ドメインロジックは PostgreSQL Function（`prisma/sql/<domain>/`）か `features/<domain>/server/` に置く

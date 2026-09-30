# features/auth

サインイン・サインアップ・オンボーディング（プロフィール作成）を置く。DB のテーブル区分には対応しない横断ドメイン。

- 方式: Google OAuth、メールアドレス + パスワード（`docs/TRD.md` §4）
- `actions.ts`: サインイン / サインアップ / サインアウト / プロフィール作成・更新 / メール・パスワード変更 / アイコンのアップロード URL 発行（Server Actions）。アカウント設定画面（`features/users`）もここを呼ぶ
- `server/`: `create-profile.ts`（`create_profile` RPC）、`get-profile.ts`、`update-profile.ts`
- `validation.ts`: 入力の Zod スキーマ。`validation.test.ts` はテスト（実行する script は未導入。`docs/技術選定.md` §4.1）
- `password-auth-error-messages.ts`: 認証エラーの表示文言

OAuth のコールバックは `app/auth/callback/route.ts`。失敗時のエラー表示は未実装（issue #140）。

検証: `npm run verify:auth`

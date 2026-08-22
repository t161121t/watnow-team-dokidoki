import type { PasswordAuthErrorStatus } from "@/features/auth/actions";

/** ログイン（LoginScreen）・新規登録（SignupScreen）で共通の日本語メッセージ。 */
export const PASSWORD_AUTH_ERROR_MESSAGES: Record<PasswordAuthErrorStatus, string> = {
  invalid_input: "入力内容を確認してください",
  email_not_confirmed:
    "メールアドレスの確認が完了していません。届いた確認メールのリンクを開いてください",
  already_registered: "このメールアドレスは既に登録されています",
  invalid_credentials: "メールアドレスまたはパスワードが正しくありません",
  rate_limited: "リクエストが多すぎます。しばらく時間をおいて再度お試しください",
  invalid_password_format: "パスワードの形式が正しくありません（8文字以上で入力してください）",
  unknown_error: "認証に失敗しました。時間をおいて再度お試しください",
};

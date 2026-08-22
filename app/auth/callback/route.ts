import { NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/features/auth/actions";

/**
 * Magic LinkメールのリンクとGoogle OAuthの両方の遷移先。`code`をセッションに
 * 交換する（exchangeCodeForSessionが初回ログイン時のプロフィール自動作成も
 * 行う）。`redirect_to`は`features/auth/actions.ts`の`signInWithMagicLink`/
 * `signInWithGoogle`が付与する（UI側が指定した、ログイン後に戻したいページ）。
 *
 * ①オンボーディング・ログイン画面は、成功時にこのルートから`redirect_to`
 * （省略時は"/"）へ、失敗時は`?auth_error=1`付きで"/"へ戻ってくる想定で
 * エラー表示を実装してほしい（エラー表示自体は未実装）。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") ?? "/";

  if (code && (await exchangeCodeForSession(code))) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/?auth_error=1`);
}

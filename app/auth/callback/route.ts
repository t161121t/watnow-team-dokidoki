import { NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/features/auth/actions";

/**
 * Magic Linkのメール内リンクの遷移先。`code`をセッションに交換する。
 * `redirect_to`は`features/auth/actions.ts`の`signInWithMagicLink`が付与する
 * （UI側が指定した、ログイン後に戻したいページ）。
 *
 * ①オンボーディング・ログイン画面（UI未実装）は、成功時にこのルートから
 * `redirect_to`（省略時は"/"）へ、失敗時は`?auth_error=1`付きで"/"へ
 * 戻ってくる想定でエラー表示を実装してほしい。
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

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Supabase Authのセッションcookieをリクエストごとにリフレッシュする。
 * Server ComponentはcookieをwriteできないためmiddlewareでのSSR標準パターン。
 *
 * 未ログイン時のリダイレクト等の認証ガードは、保護対象のルートが実装されてから追加する
 * （現状 app/ 配下に保護対象のページが無いため、ここでは付けない）。
 */
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

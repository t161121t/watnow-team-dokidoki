import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Supabase Authのセッションcookieをリクエストごとにリフレッシュする。
 * Server ComponentはcookieをwriteできないためSSRでの標準パターン。
 *
 * 未ログイン時のリダイレクト等の認証ガードは、保護対象のルートが実装されてから追加する
 * （現状 app/ 配下に保護対象のページが無いため、ここでは付けない）。
 *
 * Next.js 16でファイル規約が middleware.ts → proxy.ts に変更された
 * （node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md）。
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

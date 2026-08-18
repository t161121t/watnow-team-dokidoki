import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * proxy.ts（Next.js 16でのmiddleware後継）専用のSupabaseクライアント生成 +
 * セッションリフレッシュ。`createSupabaseServerClient`（同ディレクトリのserver.ts）は
 * Next.jsの`cookies()`（Server Component/Action用）を使うためproxyでは使えない。
 * proxyは`NextRequest`/`NextResponse`のcookie APIが必要なため、別実装にしている。
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
          // headersにはCache-Control等、認証cookieを含むレスポンスをCDN/中間
          // キャッシュにキャッシュさせないためのヘッダーが渡される。ここで
          // 落とすとセッション混線のリスクがあるため必ずresponseへコピーする。
          for (const [key, value] of Object.entries(headers)) {
            response.headers.set(key, value);
          }
        },
      },
    },
  );

  // getUser()は毎回Auth APIへリクエストする。getClaims()はJWTをJWKSで
  // ローカル検証できる（非対称鍵の場合）ため@supabase/ssrの現行例に合わせた。
  await supabase.auth.getClaims();

  return response;
}

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * このクライアントは Auth（セッション確認）・Storage・Realtime 専用。
 * テーブルの read/write・RPC 呼び出しには使わない（`lib/prisma` +
 * `lib/db/rls.ts` の withRlsContext を使う。詳細は docs/アーキテクチャ.md）。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Component から呼ばれた場合は Cookie を書けない。
            // ミドルウェアでセッションを更新している前提なら無視してよい。
          }
        },
      },
    },
  );
}

/** 現在ログイン中のユーザーIDを取得する。未ログインなら null。 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

import { createBrowserClient } from "@supabase/ssr";

/**
 * ブラウザ（Client Component）用のSupabase Client。lib/supabase/server.tsと
 * 同じくAuth・Storage・Realtime専用（テーブルのread/write・RPC呼び出しには
 * 使わない。docs/アーキテクチャ.md参照）。
 *
 * anon keyのみを使うため、呼び出しごとに新規作成してよい（重い処理はない）。
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

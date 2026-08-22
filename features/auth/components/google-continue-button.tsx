"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/features/auth/actions";

const googleMark = (
  <svg
    aria-hidden="true"
    viewBox="0 0 48 48"
    className="size-5 shrink-0"
  >
    <path
      fill="#FFC107"
      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
    />
    <path
      fill="#FF3D00"
      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
    />
    <path
      fill="#4CAF50"
      d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
    />
    <path
      fill="#1976D2"
      d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
    />
  </svg>
);

/**
 * redirectTo: ログイン成功後に特定のページへ戻したい場合のみ指定する
 * （"/"始まり）。通常は省略してよい。省略時はapp/auth/callback/route.tsが
 * 本人の所属groupを見て自動で行き先を決める（所属あり→ホーム、無し→
 * 参加/作成。2026-08-22、ログイン後にホームへ行かない不具合の修正）。
 * PR #74時点ではモックのrouter.push(href)だったが、実際のGoogle認証
 * （features/auth/actions.tsのsignInWithGoogle）に接続した（issue #72）。
 */
export function GoogleContinueButton({ redirectTo }: { redirectTo?: string }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        onClick={() => {
          setError(null);
          setIsSubmitting(true);
          signInWithGoogle({ redirectTo })
            .then((url) => window.location.assign(url))
            .catch(() => {
              setIsSubmitting(false);
              setError("Googleログインを開始できませんでした");
            });
        }}
        className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-full bg-white text-[15px] font-bold text-[#1f1f1f] shadow-[0_0_18px_rgba(255,255,255,0.12)] transition hover:bg-[#f3f3f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-45 [font-family:var(--font-noto-sans-jp)]"
      >
        {googleMark}
        {isSubmitting ? "接続中…" : "Googleで続ける"}
      </button>
      {error ? (
        <p className="mt-1.5 text-[13px] leading-normal font-bold text-[#ffb4c9]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

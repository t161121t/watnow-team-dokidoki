"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server";
import {
  AVATAR_EXTENSIONS,
  createAvatarUploadUrl as createAvatarUploadUrlInStorage,
} from "@/lib/supabase/storage";
import { createProfile } from "@/features/auth/server/create-profile";
import { getProfile } from "@/features/auth/server/get-profile";

// ログイン後に戻したいページ。省略時はコールバック側で"/"にする。
const redirectToSchema = z.object({
  redirectTo: z.string().startsWith("/").optional(),
});

const magicLinkSchema = redirectToSchema.extend({
  email: z.string().email(),
});

const passwordSignInSchema = redirectToSchema.extend({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const passwordSignUpSchema = passwordSignInSchema.extend({
  nickname: z.string().trim().min(1).max(50),
});

/**
 * Magic Linkでのサインイン/サインアップ。新規メールアドレスなら
 * Supabase Auth側が自動でauth.usersを作成する（新規/既存の分岐はSupabase任せ）。
 * public.usersの作成はここでは行わない（オンボーディング完了時のcompleteProfileで行う）。
 */
export async function signInWithMagicLink(input: {
  email: string;
  redirectTo?: string;
}) {
  const parsed = magicLinkSchema.parse(input);
  const callbackUrl = await buildCallbackUrl(parsed.redirectTo);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.email,
    options: { emailRedirectTo: callbackUrl },
  });

  if (error) {
    throw new Error("ログインリンクの送信に失敗しました");
  }
}

/**
 * Googleでのサインイン/サインアップ（issue #72）。Magic Linkと同じく、
 * 新規/既存の判定・auth.usersの作成はSupabase Auth側に任せる。public.usersの
 * 作成はここでは行わない（オンボーディング完了時のcompleteProfileで行う。
 * signInWithMagicLinkと同じ流れ）。
 *
 * signInWithOAuthはリダイレクト先URLを返すだけで自分ではリダイレクトしない
 * （ブラウザの遷移が必要なため）。Server Action内でnext/navigationのredirect()
 * を呼び、呼び出し元（フォームのaction等）はこの関数を直接呼べば良い。
 */
export async function signInWithGoogle(input: { redirectTo?: string } = {}) {
  const parsed = redirectToSchema.parse(input);
  const callbackUrl = await buildCallbackUrl(parsed.redirectTo);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    throw new Error("Googleログインの開始に失敗しました");
  }

  redirect(data.url);
}

/**
 * メールアドレス・パスワードでのログイン（issue #76）。Magic Link/Googleと違い
 * リダイレクトを挟まずこのServer Action内でセッションが確立するため、
 * 成功時はそのままredirect()する。
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  redirectTo?: string;
}) {
  const parsed = passwordSignInSchema.parse(input);
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    throw new Error(mapPasswordAuthError(error.message));
  }

  redirect(parsed.redirectTo ?? "/groups");
}

/**
 * メールアドレス・パスワードでの新規登録（issue #76）。ニックネームはサインアップ
 * 画面で既に入力させているため、Magic Link/Googleと違いオンボーディングでの
 * 追加入力を待たず、ここで直接public.usersを作成する。
 *
 * Supabase側の「メール確認」設定が有効な場合、`signUp`は成功してもセッションを
 * 返さない（`data.session === null`）。この場合はまだプロフィールを作成できない
 * （auth.uidが取れない）ため、確認メール送信のみで終える。確認リンクを踏むと
 * `emailRedirectTo`経由で`app/auth/callback/route.ts`に来て、`exchangeCodeForSession`
 * が`user_metadata.nickname`（ここで`options.data`に積んでいる）を使って
 * プロフィールを作成する。
 */
export async function signUpWithPassword(input: {
  email: string;
  password: string;
  nickname: string;
  redirectTo?: string;
}): Promise<{ confirmationRequired: boolean }> {
  const parsed = passwordSignUpSchema.parse(input);
  const callbackUrl = await buildCallbackUrl(parsed.redirectTo);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.email,
    password: parsed.password,
    options: {
      data: { nickname: parsed.nickname },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    throw new Error(mapPasswordAuthError(error.message));
  }

  if (!data.user || !data.session) {
    return { confirmationRequired: true };
  }

  await createProfile(data.user.id, parsed.nickname, null);
  redirect(parsed.redirectTo ?? "/groups");
}

/**
 * Supabaseのエラーメッセージ（英語）を画面表示用の日本語メッセージに変換する。
 * どのメールアドレスが未登録/未確認かを漏らさないよう、ログイン失敗は
 * 「メールアドレスまたはパスワードが正しくありません」に丸める。
 */
function mapPasswordAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) {
    return "メールアドレスの確認が完了していません。届いた確認メールのリンクを開いてください";
  }
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "このメールアドレスは既に登録されています";
  }
  if (lower.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません";
  }
  if (lower.includes("rate limit")) {
    return "リクエストが多すぎます。しばらく時間をおいて再度お試しください";
  }
  if (lower.includes("password")) {
    return "パスワードの形式が正しくありません（8文字以上で入力してください）";
  }
  return "認証に失敗しました。時間をおいて再度お試しください";
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("ログアウトに失敗しました");
  }
}

const completeProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(50),
  avatarPath: z.string().optional(),
});

const avatarUploadSchema = z.object({
  extension: z.enum(AVATAR_EXTENSIONS),
});

/**
 * オンボーディング（①）でのアバター画像アップロード用に、署名付きアップロードURLを
 * 発行する。UI側は返り値の`signedUrl`に画像ファイルを直接PUTし、その`path`を
 * completeProfileの`avatarPath`に渡す想定（この関数自体はusers行を更新しない）。
 */
export async function createAvatarUploadUrl(input: { extension: string }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("ログインが必要です");
  }

  const parsed = avatarUploadSchema.parse(input);
  return createAvatarUploadUrlInStorage(userId, parsed.extension);
}

/**
 * オンボーディング（①）でニックネーム・アイコンを入力した後に呼ぶ。
 * public.usersの行はこれが唯一の作成経路（create_profile RPC）。
 */
export async function completeProfile(input: {
  nickname: string;
  avatarPath?: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("ログインが必要です");
  }

  const parsed = completeProfileSchema.parse(input);
  return createProfile(userId, parsed.nickname, parsed.avatarPath ?? null);
}

/**
 * Magic Link / Google共通のコールバック遷移先（app/auth/callback/route.ts）
 * から呼ばれる。`code`をセッションに交換するだけで、Supabase Client（Auth用途）
 * を直接扱うのはlib/supabase/server.ts経由のここに閉じる（app/からlib/supabase/
 * serverを直接importしないため。docs/アーキテクチャ.md §1.1参照）。
 *
 * 2026-08-22（issue #72、Google OAuth接続時に追加）: 初回OAuthログインだと
 * public.usersの行がまだ無い（作成経路はcompleteProfileのみだが、専用の
 * オンボーディング画面はまだ実装されていない）。行が無ければGoogleの
 * user_metadata（full_name/name）を仮ニックネームとしてcreate_profileを
 * 呼び、最低限アプリが動く状態にする。Magic Link（メールのみでニックネーム
 * 情報が無い）の場合はfallbackとしてメールのローカル部を使う。
 * ニックネームは後からアカウント設定（⑮）で変更できる想定。
 *
 * 2026-08-22（issue #76、メールアドレス・パスワード認証の確認メールリンク経由）:
 * メール確認が必要な設定の場合、signUpWithPasswordはセッションを持たないまま
 * 返り確認メールを送るだけで終わる。確認リンクを踏むとここに来るため、
 * signUpWithPasswordが`options.data`に積んだ`user_metadata.nickname`
 * （サインアップ画面で入力させた本来のニックネーム）を最優先で使う。
 */
export async function exchangeCodeForSession(code: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) {
    return false;
  }

  const existingProfile = await getProfile(data.user.id);
  if (!existingProfile) {
    const metadata = data.user.user_metadata as Record<string, unknown>;
    const fallbackNickname =
      (typeof metadata.nickname === "string" && metadata.nickname) ||
      (typeof metadata.full_name === "string" && metadata.full_name) ||
      (typeof metadata.name === "string" && metadata.name) ||
      data.user.email?.split("@")[0] ||
      "ゲスト";
    await createProfile(data.user.id, fallbackNickname.slice(0, 50), null);
  }

  return true;
}

async function resolveOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const protocol = h.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

/** signInWithMagicLink/signInWithGoogle共通。app/auth/callback/route.tsへのURLを組み立てる。 */
async function buildCallbackUrl(redirectTo?: string) {
  const origin = await resolveOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  if (redirectTo) {
    callbackUrl.searchParams.set("redirect_to", redirectTo);
  }
  return callbackUrl.toString();
}

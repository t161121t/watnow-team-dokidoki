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

// ログイン後に戻したいページ。省略時はコールバック側で"/"にする。
const redirectToSchema = z.object({
  redirectTo: z.string().startsWith("/").optional(),
});

const magicLinkSchema = redirectToSchema.extend({
  email: z.string().email(),
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
 * Magic Linkメール内リンクの遷移先（app/auth/callback/route.ts）から呼ばれる。
 * `code`をセッションに交換するだけで、Supabase Client（Auth用途）を直接扱うのは
 * lib/supabase/server.ts経由のここに閉じる（app/からlib/supabase/serverを
 * 直接importしないため。docs/アーキテクチャ.md §1.1参照）。
 */
export async function exchangeCodeForSession(code: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return !error;
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

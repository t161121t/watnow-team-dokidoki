"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createSupabaseServerClient, getCurrentUserId } from "@/lib/supabase/server";
import { createProfile } from "@/features/auth/server/create-profile";

const magicLinkSchema = z.object({
  email: z.string().email(),
  // ログイン後に戻したいページ。省略時はコールバック側で"/"にする。
  redirectTo: z.string().startsWith("/").optional(),
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
  const origin = await resolveOrigin();
  const supabase = await createSupabaseServerClient();

  const callbackUrl = new URL("/auth/callback", origin);
  if (parsed.redirectTo) {
    callbackUrl.searchParams.set("redirect_to", parsed.redirectTo);
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.email,
    options: { emailRedirectTo: callbackUrl.toString() },
  });

  if (error) {
    throw new Error("ログインリンクの送信に失敗しました");
  }
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}

const completeProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(50),
  avatarPath: z.string().optional(),
});

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

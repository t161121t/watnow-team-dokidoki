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
import { isSafeRedirectPath } from "@/lib/redirect-path";

// ログイン後に戻したいページ。省略時はコールバック側で"/"にする。
// "//evil.example"のようなプロトコル相対URLはstartsWith("/")だけでは弾けず
// オープンリダイレクトになるため、isSafeRedirectPathで検証する
// （2026-08-22レビュー指摘。app/login/page.tsxの検証と同じ関数を使う）。
const redirectToSchema = z.object({
  redirectTo: z
    .string()
    .refine(isSafeRedirectPath, { message: "redirectTo must be an internal app path" })
    .optional(),
});

const passwordSignInSchema = redirectToSchema.extend({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

const passwordSignUpSchema = passwordSignInSchema.extend({
  nickname: z.string().trim().min(1).max(50),
});

/**
 * Googleでのサインイン/サインアップ（issue #72）。新規/既存の判定・auth.usersの
 * 作成はSupabase Auth側に任せる。public.usersの作成はここでは行わない
 * （オンボーディング完了時のcompleteProfileで行う）。
 *
 * signInWithOAuthが返すのはGoogleの認可画面（外部オリジン）へのURLのみ。
 * ここでnext/navigationのredirect()を呼ぶと、フォームaction経由ではなく
 * onClickから直接呼ばれるこの関数では、ブラウザが実際に遷移する前に
 * NEXT_REDIRECT信号がクライアント側の.catch()に予期せず捕まり、遷移直前に
 * 一瞬エラーメッセージが表示されてしまう不具合があった（2026-08-23、
 * ユーザー報告）。そのためリダイレクトはせず、URLを返してクライアント側で
 * window.location.hrefにより遷移させる（features/auth/components/
 * google-continue-button.tsx参照）。
 */
export type SignInWithGoogleResult = { status: "ok"; url: string } | { status: "failed" };

export async function signInWithGoogle(
  input: { redirectTo?: string } = {},
): Promise<SignInWithGoogleResult> {
  const parsed = redirectToSchema.safeParse(input);
  if (!parsed.success) return { status: "failed" };

  const callbackUrl = await buildCallbackUrl(parsed.data.redirectTo);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callbackUrl },
  });

  if (error || !data.url) {
    return { status: "failed" };
  }

  return { status: "ok", url: data.url };
}

/**
 * Supabaseのエラーメッセージ（英語）を画面表示用の分類コードに丸める。
 * どのメールアドレスが未登録/未確認かを漏らさないよう、ログイン失敗は
 * 「メールアドレスまたはパスワードが正しくありません」に丸める。
 *
 * throwではなく戻り値のstatusで表現する（features/groups/actions.tsの
 * joinGroupViaInviteLinkと同じパターン）。throw/error.messageの文字列比較には
 * 依存しない設計にしたのは、本番ビルドではServer Actionのエラーメッセージが
 * サニタイズされ、ここで組み立てた日本語メッセージ自体がクライアントに
 * 届かなくなるため（2026-08-23、ユーザー報告を受けたfeatures/auctions/actions.ts
 * の同種の修正と同じ理由）。日本語文言はクライアント側の呼び出し元
 * コンポーネントで持つ。
 *
 * signInWithPassword/signUpWithPasswordは、入力不正もPromise rejectさせず
 * statusで返す（features/auctions/actions.tsのPR #102レビュー指摘と同じ
 * 理由）。新しいチェックを追加する際はzod .parse()（throw系）ではなく
 * safeParse()でstatusを返すこと。
 */
export type PasswordAuthErrorStatus =
  | "invalid_input"
  | "email_not_confirmed"
  | "already_registered"
  | "invalid_credentials"
  | "rate_limited"
  | "invalid_password_format"
  | "unknown_error";

function mapPasswordAuthErrorStatus(message: string): PasswordAuthErrorStatus {
  const lower = message.toLowerCase();
  if (lower.includes("email not confirmed")) return "email_not_confirmed";
  if (lower.includes("already registered") || lower.includes("already exists")) {
    return "already_registered";
  }
  if (lower.includes("invalid login credentials")) return "invalid_credentials";
  if (lower.includes("rate limit")) return "rate_limited";
  if (lower.includes("password")) return "invalid_password_format";
  return "unknown_error";
}

export type SignInResult = { status: PasswordAuthErrorStatus };

/**
 * メールアドレス・パスワードでのログイン（issue #76）。Googleと違い
 * リダイレクトを挟まずこのServer Action内でセッションが確立するため、
 * 成功時はそのままredirect()する（呼び出し元に戻ってくるのは失敗時のみ）。
 * redirectTo省略時は"/"へ送り、app/page.tsxが所属を見てホーム⑥または
 * 参加/作成へ分岐する（このファイルからfeatures/groupsは呼べない）。
 */
export async function signInWithPassword(input: {
  email: string;
  password: string;
  redirectTo?: string;
}): Promise<SignInResult> {
  const parsed = passwordSignInSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid_input" };

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { status: mapPasswordAuthErrorStatus(error.message) };
  }

  redirect(parsed.data.redirectTo ?? "/");
}

export type SignUpResult = { status: "confirmation_required" } | { status: PasswordAuthErrorStatus };

/**
 * メールアドレス・パスワードでの新規登録（issue #76）。ニックネームはサインアップ
 * 画面で既に入力させているため、Googleと違いオンボーディングでの追加入力を
 * 待たず、ここで直接public.usersを作成する。
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
}): Promise<SignUpResult> {
  const parsed = passwordSignUpSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid_input" };

  const callbackUrl = await buildCallbackUrl(parsed.data.redirectTo);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { nickname: parsed.data.nickname },
      emailRedirectTo: callbackUrl,
    },
  });

  if (error) {
    return { status: mapPasswordAuthErrorStatus(error.message) };
  }

  if (!data.user || !data.session) {
    return { status: "confirmation_required" };
  }

  // signUp自体は成功しているため（Supabase Auth側にユーザーは既に存在する）、
  // ここでcreateProfileが失敗してもthrowせずstatusで返す（Codexレビュー指摘:
  // ここをtry/catchで囲まないとPromiseがrejectし、isSubmittingが戻らず
  // フォームが操作不能のまま固まってしまう）。
  try {
    await createProfile(data.user.id, parsed.data.nickname, null);
  } catch {
    return { status: "unknown_error" };
  }

  redirect(parsed.data.redirectTo ?? "/");
}

/** アカウント設定（⑮）でのログアウト。成功したらログイン画面へ戻す。 */
export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error("ログアウトに失敗しました");
  }
  redirect("/login");
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
 * ログイン済みユーザーのuserIdを返す。未ログインならnull（例外にしない）。
 * app/層は`lib/supabase/server`を直接importできない（ESLint boundaries）
 * ため、app/層のページで「ログイン確認してから先の処理に進む」ガードを
 * 書く時はこれを使う。エラーメッセージの文字列比較で認証状態を判定する
 * のは、呼び出し先の実装やメッセージ文言が変わるだけで壊れる脆いAPI契約
 * になるため避ける（2026-08-23レビュー指摘）。
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  return getCurrentUserId();
}

/**
 * アカウント設定（⑮）・マイページ（⑭）での本人プロフィール表示用。
 * emailはauth.usersにしか無い（public.usersに複製していない）ため、
 * getProfile（public.users）とSupabase Authのgetterを両方呼んで合成する。
 *
 * 未ログイン時はnullを返す（例外にしない）。呼び出し元のpage.tsxが
 * redirect("/login")するかどうかを判断する（proxy.tsではまだ保護対象
 * ルートのガードを実装していない。proxy.tsのコメント参照）。
 */
export async function getCurrentUserProfile() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const [{ data }, profile] = await Promise.all([
    supabase.auth.getUser(),
    getProfile(userId),
  ]);

  return {
    id: userId,
    email: data.user?.email ?? null,
    nickname: profile?.nickname ?? null,
    avatarPath: profile?.avatarPath ?? null,
  };
}

/**
 * Google OAuth / メールアドレス・パスワード共通のコールバック遷移先
 * （app/auth/callback/route.ts）から呼ばれる。`code`をセッションに交換するだけで、
 * Supabase Client（Auth用途）を直接扱うのはlib/supabase/server.ts経由のここに
 * 閉じる（app/からlib/supabase/serverを直接importしないため。
 * docs/アーキテクチャ.md §1.1参照）。
 *
 * 2026-08-22（issue #72、Google OAuth接続時に追加）: 初回OAuthログインだと
 * public.usersの行がまだ無い（作成経路はcompleteProfileのみだが、専用の
 * オンボーディング画面はまだ実装されていない）。行が無ければGoogleの
 * user_metadata（full_name/name）を仮ニックネームとしてcreate_profileを呼び、
 * 最低限アプリが動く状態にする。ニックネームは後からアカウント設定（⑮）で
 * 変更できる想定。
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

/** signInWithGoogle/signUpWithPassword共通。app/auth/callback/route.tsへのURLを組み立てる。 */
async function buildCallbackUrl(redirectTo?: string) {
  const origin = await resolveOrigin();
  const callbackUrl = new URL("/auth/callback", origin);
  if (redirectTo) {
    callbackUrl.searchParams.set("redirect_to", redirectTo);
  }
  return callbackUrl.toString();
}

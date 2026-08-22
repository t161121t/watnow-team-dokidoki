import { NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/features/auth/actions";
import { getMyGroups } from "@/features/groups/actions";
import { isSafeRedirectPath, postAuthDestination } from "@/lib/redirect-path";

/**
 * Google OAuthと、メールアドレス・パスワード新規登録時の確認メールリンクの
 * 両方の遷移先。`code`をセッションに交換する（exchangeCodeForSessionが初回
 * ログイン時のプロフィール自動作成も行う）。`redirect_to`は
 * `features/auth/actions.ts`の`signInWithGoogle`/`signUpWithPassword`が
 * 明示的に指定された場合のみ付与される（通常は未指定）。
 *
 * `redirect_to`が無い（または安全でない）場合は、本人の所属groupを見て
 * 遷移先を決める（docs/画面.md §2: 所属ありならホーム画面⑥、未所属なら
 * グループ一覧`/groups`の空状態へ。旧参加/作成ハブ`/groups/join`は/groupsへ
 * 統合済み。判定はlib/redirect-path.tsのpostAuthDestination）。
 * ドメインをまたぐ判断（auth×groups）なのでapp/側（ここ）で両ドメインの
 * actions.tsを呼ぶ形にした（features/README.mdの依存方向に合わせるため。
 * features/auth/actions.tsからfeatures/groups/*を直接importしない）。
 *
 * 失敗時は`?auth_error=1`付きで"/"へ戻る（エラー表示自体は未実装）。
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const explicitRedirectTo = searchParams.get("redirect_to");

  if (!code || !(await exchangeCodeForSession(code))) {
    return NextResponse.redirect(`${origin}/?auth_error=1`);
  }

  if (explicitRedirectTo && isSafeRedirectPath(explicitRedirectTo)) {
    return NextResponse.redirect(`${origin}${explicitRedirectTo}`);
  }

  const myGroups = await getMyGroups();
  return NextResponse.redirect(`${origin}${postAuthDestination(myGroups)}`);
}

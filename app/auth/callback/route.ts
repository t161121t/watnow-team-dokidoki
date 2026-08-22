import { NextResponse } from "next/server";
import { exchangeCodeForSession } from "@/features/auth/actions";
import { getMyGroups } from "@/features/groups/actions";

/**
 * Google OAuthと、メールアドレス・パスワード新規登録時の確認メールリンクの
 * 両方の遷移先。`code`をセッションに交換する（exchangeCodeForSessionが初回
 * ログイン時のプロフィール自動作成も行う）。`redirect_to`は
 * `features/auth/actions.ts`の`signInWithGoogle`/`signUpWithPassword`が
 * 明示的に指定された場合のみ付与される（通常は未指定）。
 *
 * `redirect_to`が無い場合は、本人の所属groupを見て遷移先を決める
 * （docs/画面.md §2: 所属ありならホーム画面⑥、未所属ならグループ一覧
 * （features/groups/components/group-switcher-screen.tsx、`/groups`）の
 * 空状態へ。旧参加/作成ハブ`/groups/join`は/groupsへ統合済み）。
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

  if (explicitRedirectTo) {
    return NextResponse.redirect(`${origin}${explicitRedirectTo}`);
  }

  const myGroups = await getMyGroups();
  const destination = myGroups.length > 0 ? `/groups/${myGroups[0].id}` : "/groups";
  return NextResponse.redirect(`${origin}${destination}`);
}

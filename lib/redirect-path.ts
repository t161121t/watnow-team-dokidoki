/**
 * ログイン後などの`redirect_to`クエリ/引数で使う。オープンリダイレクト対策
 * として、`//evil.example`（プロトコル相対URL。ブラウザは現在のプロトコルを
 * 補ってそのホストへ遷移する）や`/\evil.example`（一部ブラウザがバックスラッシュを
 * スラッシュへ正規化するため同様に外部へ飛べてしまう）を弾き、必ずアプリ内の
 * 単一スラッシュパスだけを許可する（2026-08-22レビュー指摘。Codex + 人力）。
 */
export function isSafeRedirectPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\");
}

/**
 * ログイン済みユーザーのデフォルト遷移先（docs/画面.md §2）。
 * 所属ありならホーム⑥、未所属なら参加/作成。複数所属時は作成が古い順の先頭
 * （getMyGroupsのorderByと同じ。最後に開いたグループの記憶は未実装）。
 */
export function postAuthDestination(groups: { id: string }[]): string {
  return groups.length > 0 ? `/groups/${groups[0].id}` : "/groups/join";
}

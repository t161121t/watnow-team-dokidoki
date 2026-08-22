import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * public.usersにプロフィール行があるかどうかの確認用。OAuthコールバック
 * （features/auth/actions.tsのhandleAuthCallback）で、初回ログインかどうかの
 * 判定に使う。
 */
export async function getProfile(userId: string) {
  return withRlsContext(userId, (tx) => tx.user.findUnique({ where: { id: userId } }));
}

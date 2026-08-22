import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/features/auth/actions";
import { getMyGroups } from "@/features/groups/actions";
import { postAuthDestination } from "@/lib/redirect-path";

/**
 * アプリの入口。未ログインならログイン画面、ログイン済みなら所属を見て
 * ホーム⑥または参加/作成へ送る（docs/画面.md §2）。
 */
export default async function HomePage() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect("/login");
  }

  const myGroups = await getMyGroups();
  redirect(postAuthDestination(myGroups));
}

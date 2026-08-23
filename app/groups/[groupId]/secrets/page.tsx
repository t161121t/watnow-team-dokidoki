import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getMyDealerAuctions } from "@/features/auctions/actions";
import { formatRemainingLabel } from "@/features/auctions/format";
import { getAuthenticatedUserId } from "@/features/auth/actions";
import { getGroup } from "@/features/groups/actions";
import { SecretListScreen } from "@/features/secrets/components/secret-list-screen";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";
import type { SecretListItem } from "@/features/secrets/types";

export default async function SecretsPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/secrets">) {
  const [{ groupId }, { tab, new: newParam }] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  // app/層はlib/supabase/serverを直接importできない（ESLint boundaries）
  // ため、features/auth/actions.tsのgetAuthenticatedUserIdでログイン確認
  // してから、cross-domainのgetMyDealerAuctions（auctionsドメイン）を呼ぶ
  // （app/groups/[groupId]/page.tsxと同じ理由。2026-08-23レビュー指摘）。
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/secrets`)}`);
  }

  // 新規登録シート（⑦。旧 /secrets/new ページのボトムシート化）はURLクエリ
  // ?new=1 で開く。開くときは旧ページと同じく、groupIdのactiveメンバーかを
  // 確認する。ログイン確認だけだと、他グループのUUIDを知っていれば非メンバー
  // でも登録フォームが表示できてしまい、グループ完全分離の方針に反する
  // （register_secret RPC自体は非メンバーを拒否するため実害は無いが、表示
  // そのものを避ける。旧app/groups/[groupId]/secrets/new/page.tsxのガードを踏襲）。
  const createOpen = newParam === "1";
  if (createOpen) {
    const group = await getGroup({ groupId });
    if (!group) {
      notFound();
    }
  }

  // ディーラータブのデータ（auctionsドメイン）はfeatures/secrets/components/
  // secret-list-screen.tsxから直接読めない（ドメイン境界。同ファイルの
  // コメント参照）ため、ここでcross-domainのactions.ts経由で取得して渡す。
  const dealerRows = await getMyDealerAuctions({ groupId });
  const dealer: SecretListItem[] = dealerRows.map((row) => ({
    id: row.secret_group_item_id,
    groupId,
    viewRole: "dealer",
    title: row.title,
    category: row.category,
    rarity: row.rarity,
    value: row.current_price,
    badgeLabel: formatRemainingLabel(row.ends_at, row.status),
  }));

  return (
    <SecretListScreen
      groupId={groupId}
      dealer={dealer}
      tab={parseSecretListTab(tab)}
      createOpen={createOpen}
    />
  );
}

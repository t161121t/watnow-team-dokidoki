import { getMyDealerAuctions } from "@/features/auctions/actions";
import { formatRemainingLabel } from "@/features/auctions/format";
import { SecretListScreen } from "@/features/secrets/components/secret-list-screen";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";
import type { SecretListItem } from "@/features/secrets/types";

export default async function SecretsPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/secrets">) {
  const [{ groupId }, { tab }] = await Promise.all([params, searchParams]);

  // ディーラータブのデータ（auctionsドメイン）はfeatures/secrets/components/
  // secret-list-screen.tsxから直接読めない（ドメイン境界。同ファイルの
  // コメント参照）ため、ここでcross-domainのactions.ts経由で取得して渡す。
  const dealerRows = await getMyDealerAuctions({ groupId });
  const dealer: SecretListItem[] = dealerRows.map((row) => ({
    id: row.secret_group_item_id,
    groupId,
    viewRole: "dealer",
    summary: row.summary,
    category: row.category,
    rarity: row.rarity,
    value: row.current_price,
    badgeLabel: formatRemainingLabel(row.ends_at, row.status),
  }));

  return (
    <SecretListScreen groupId={groupId} dealer={dealer} tab={parseSecretListTab(tab)} />
  );
}

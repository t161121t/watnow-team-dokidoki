import { listMySecrets, listMyWinnings } from "@/features/secrets/actions";
import { getMyDealerAuctions } from "@/features/auctions/actions";
import { SecretListScreen } from "@/features/secrets/components/secret-list-screen";
import { formatRemainingLabel } from "@/features/auctions/format";
import type { SecretGroupItemStatus, SecretListItem } from "@/features/secrets/types";

const STATUS_LABELS: Record<SecretGroupItemStatus, string> = {
  registered: "登録済み",
  listed: "承認待ち",
  on_auction: "出品中",
  sold: "落札済み",
  returned: "返却済み",
  withdrawn: "取消済み",
};

export default async function SecretsPage({
  params,
}: PageProps<"/groups/[groupId]/secrets">) {
  const { groupId } = await params;

  const [mineRows, dealerRows, winningRows] = await Promise.all([
    listMySecrets({ groupId }),
    getMyDealerAuctions({ groupId }),
    listMyWinnings({ groupId }),
  ]);

  const mine: SecretListItem[] = mineRows.map((item) => ({
    id: item.id,
    groupId,
    viewRole: "owner",
    summary: item.secret.summary,
    category: item.secret.category,
    rarity: item.secret.rarity,
    value: item.currentValue,
    badgeLabel: STATUS_LABELS[item.status],
  }));

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

  const collection: SecretListItem[] = winningRows.map((row) => ({
    id: row.secret_id,
    groupId,
    viewRole: "winner",
    summary: row.summary,
    category: row.category,
    rarity: row.rarity,
    value: row.final_price ?? 0,
  }));

  return (
    <SecretListScreen groupId={groupId} mine={mine} dealer={dealer} collection={collection} />
  );
}

import { notFound } from "next/navigation";

import { getCollectionItem } from "@/features/secrets/actions";
import { SecretViewerScreen } from "@/features/secrets/components/secret-viewer-screen";

function formatDateLabel(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export default async function CollectionSecretPage({
  params,
}: PageProps<"/groups/[groupId]/collection/[secretId]">) {
  const { groupId, secretId } = await params;
  const item = await getCollectionItem({ groupId, secretId });

  if (!item) {
    notFound();
  }

  return (
    <SecretViewerScreen
      secret={{
        groupId,
        summary: item.summary,
        body: item.body,
        category: item.category,
        rarity: item.rarity,
        ownerName: item.seller_nickname ?? "不明",
        finalPrice: item.final_price,
        grantedAtLabel: formatDateLabel(item.granted_at),
      }}
    />
  );
}

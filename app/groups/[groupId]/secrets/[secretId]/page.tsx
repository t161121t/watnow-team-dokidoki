import { SecretDetailScreen } from "@/features/secrets/components/secret-detail-screen";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";
import { mockAuctions } from "@/lib/mocks/auctions";
import { getSecret } from "@/lib/mocks/secrets";

export default async function SecretDetailPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/secrets/[secretId]">) {
  const [{ groupId, secretId }, { tab }] = await Promise.all([params, searchParams]);
  const source = getSecret(secretId);
  const secret = { ...source, groupId };
  const auction = mockAuctions.find((item) => item.secretId === secretId) ?? mockAuctions[0];
  const defaultTab = source.viewRole === "dealer" ? "dealer" : "mine";

  return (
    <SecretDetailScreen
      secret={secret}
      bids={auction.bids}
      returnTab={parseSecretListTab(tab, defaultTab)}
    />
  );
}

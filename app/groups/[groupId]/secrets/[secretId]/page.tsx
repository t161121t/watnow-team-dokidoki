import { SecretDetailScreen } from "@/features/secrets/components/secret-detail-screen";
import { mockAuctions } from "@/lib/mocks/auctions";
import { getSecret } from "@/lib/mocks/secrets";

export default async function SecretDetailPage({
  params,
}: PageProps<"/groups/[groupId]/secrets/[secretId]">) {
  const { groupId, secretId } = await params;
  const source = getSecret(secretId);
  const secret = { ...source, groupId };
  const auction = mockAuctions.find((item) => item.secretId === secretId) ?? mockAuctions[0];

  return <SecretDetailScreen secret={secret} bids={auction.bids} />;
}

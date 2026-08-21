import { SecretViewerScreen } from "@/features/secrets/components/secret-viewer-screen";
import { getSecret } from "@/lib/mocks/secrets";

export default async function CollectionSecretPage({
  params,
}: PageProps<"/groups/[groupId]/collection/[secretId]">) {
  const { groupId, secretId } = await params;
  const source = getSecret(secretId);

  return <SecretViewerScreen secret={{ ...source, groupId, viewRole: "winner" }} />;
}

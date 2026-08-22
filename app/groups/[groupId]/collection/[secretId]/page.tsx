import { SecretViewerScreen } from "@/features/secrets/components/secret-viewer-screen";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";
import { getSecret } from "@/lib/mocks/secrets";

export default async function CollectionSecretPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/collection/[secretId]">) {
  const [{ groupId, secretId }, { tab }] = await Promise.all([params, searchParams]);
  const source = getSecret(secretId);

  return (
    <SecretViewerScreen
      secret={{ ...source, groupId, viewRole: "winner" }}
      returnTab={parseSecretListTab(tab, "collection")}
    />
  );
}

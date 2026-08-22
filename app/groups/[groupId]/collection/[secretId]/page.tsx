import { SecretViewerScreen } from "@/features/secrets/components/secret-viewer-screen";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";

export default async function CollectionSecretPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/collection/[secretId]">) {
  const [{ groupId, secretId }, { tab }] = await Promise.all([params, searchParams]);

  return (
    <SecretViewerScreen
      groupId={groupId}
      secretId={secretId}
      returnTab={parseSecretListTab(tab, "collection")}
    />
  );
}

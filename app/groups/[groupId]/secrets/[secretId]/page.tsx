import { SecretDetailLoader } from "@/features/secrets/components/secret-detail-loader";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";

export default async function SecretDetailPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/secrets/[secretId]">) {
  const [{ groupId, secretId }, { tab }] = await Promise.all([params, searchParams]);

  return (
    <SecretDetailLoader
      groupId={groupId}
      secretGroupItemId={secretId}
      returnTab={parseSecretListTab(tab)}
    />
  );
}

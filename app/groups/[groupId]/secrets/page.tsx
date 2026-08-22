import { SecretListScreen } from "@/features/secrets/components/secret-list-screen";
import { parseSecretListTab } from "@/features/secrets/secret-list-tab";
import { getGroup } from "@/lib/mocks/groups";
import { getSecretsForGroup } from "@/lib/mocks/secrets";

export default async function SecretsPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/secrets">) {
  const [{ groupId }, { tab }] = await Promise.all([params, searchParams]);

  return (
    <SecretListScreen
      group={getGroup(groupId)}
      secrets={getSecretsForGroup(groupId)}
      tab={parseSecretListTab(tab)}
    />
  );
}

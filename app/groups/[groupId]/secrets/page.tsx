import { SecretListScreen } from "@/features/secrets/components/secret-list-screen";
import { getGroup } from "@/lib/mocks/groups";
import { getSecretsForGroup } from "@/lib/mocks/secrets";

export default async function SecretsPage({
  params,
}: PageProps<"/groups/[groupId]/secrets">) {
  const { groupId } = await params;

  return (
    <SecretListScreen
      group={getGroup(groupId)}
      secrets={getSecretsForGroup(groupId)}
    />
  );
}

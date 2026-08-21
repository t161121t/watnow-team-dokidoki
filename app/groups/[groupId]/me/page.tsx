import { ProfileScreen } from "@/features/users/components/profile-screen";
import { getGroup } from "@/lib/mocks/groups";
import { getSecretsForGroup } from "@/lib/mocks/secrets";
import { currentUser } from "@/lib/mocks/users";

export default async function MyPage({
  params,
}: PageProps<"/groups/[groupId]/me">) {
  const { groupId } = await params;
  const collection = getSecretsForGroup(groupId).filter(
    (secret) => secret.viewRole === "winner",
  );

  return (
    <ProfileScreen
      group={getGroup(groupId)}
      user={currentUser}
      collection={collection}
    />
  );
}

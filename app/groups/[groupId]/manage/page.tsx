import { GroupManageScreen } from "@/features/groups/components/group-manage-screen";
import { getGroup, mockMemberships } from "@/lib/mocks/groups";

export default async function GroupManagePage({
  params,
}: PageProps<"/groups/[groupId]/manage">) {
  const { groupId } = await params;

  return <GroupManageScreen group={getGroup(groupId)} memberships={mockMemberships} />;
}

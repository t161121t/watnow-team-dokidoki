import { GroupManageScreen } from "@/features/groups/components/group-manage-screen";

export default async function GroupManagePage({
  params,
}: PageProps<"/groups/[groupId]/manage">) {
  const { groupId } = await params;

  return <GroupManageScreen groupId={groupId} />;
}

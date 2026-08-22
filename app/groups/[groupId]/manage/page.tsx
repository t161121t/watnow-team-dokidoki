import { notFound } from "next/navigation";

import { GroupManageScreen } from "@/features/groups/components/group-manage-screen";
import type { ManageScreenMember } from "@/features/groups/components/group-manage-screen";
import { getGroup, getGroupMembers, getInviteLink } from "@/features/groups/actions";

export default async function GroupManagePage({
  params,
}: PageProps<"/groups/[groupId]/manage">) {
  const { groupId } = await params;

  const [group, members, inviteLink] = await Promise.all([
    getGroup({ groupId }),
    getGroupMembers({ groupId }),
    getInviteLink({ groupId }),
  ]);

  if (!group) {
    notFound();
  }

  const manageMembers: ManageScreenMember[] = members.map((member) => ({
    userId: member.userId,
    nickname: member.user.nickname,
    role: member.role,
  }));

  return (
    <GroupManageScreen
      group={{ id: group.id, name: group.name, iconPath: group.iconPath }}
      members={manageMembers}
      inviteLinkCode={inviteLink?.code ?? null}
    />
  );
}

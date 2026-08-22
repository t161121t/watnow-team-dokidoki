import type {
  Group,
  GroupInvitation,
  GroupMembership,
} from "@/lib/types/group";
import { mockUsers } from "@/lib/mocks/users";

/** モック上の選択中グループ。ログイン後はこのグループのホームへ進む。 */
export const mockCurrentGroupId = "watnow";

export const mockGroups: Group[] = [
  {
    id: "night-owls",
    name: "深夜テンション部",
    description: "大学のいつものメンバー。秘密は墓場まで。",
    memberCount: 8,
    balance: 850,
    role: "admin",
    icon: "🌙",
    nextAuctionLabel: "金曜 22:00 開催",
  },
  {
    id: "watnow",
    name: "watnow 25期",
    description: "制作も秘密も全力で楽しむグループ。",
    memberCount: 12,
    balance: 430,
    role: "member",
    icon: "⚡️",
    nextAuctionLabel: "日曜 21:00 開催",
  },
  {
    id: "childhood",
    name: "幼なじみ会",
    description: "知りすぎている4人の集まり。",
    memberCount: 4,
    balance: 1_240,
    role: "member",
    icon: "🪩",
    nextAuctionLabel: "8/30 20:00 開催",
  },
];

export const mockInvitations: GroupInvitation[] = [
  {
    id: "invite-1",
    groupId: "festival",
    groupName: "夏フェス作戦会議",
    groupIcon: "🎧",
    inviterName: "みお",
    invitedAtLabel: "8月20日",
    memberCount: 6,
  },
  {
    id: "invite-2",
    groupId: "lab",
    groupName: "研究室同期",
    groupIcon: "🧪",
    inviterName: "れん",
    invitedAtLabel: "8月18日",
    memberCount: 9,
  },
];

export const mockMemberships: GroupMembership[] = mockUsers.map((user, index) => ({
  user,
  role: index === 0 ? "admin" : "member",
  balance: [850, 620, 410, 280][index] ?? 0,
}));

export function getGroup(groupId: string): Group {
  return (
    mockGroups.find((group) => group.id === groupId) ?? {
      ...mockGroups[0],
      id: groupId,
      name: "新しいグループ",
    }
  );
}

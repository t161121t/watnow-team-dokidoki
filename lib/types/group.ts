import type { User } from "@/lib/types/user";

export type GroupRole = "admin" | "member";

export type Group = {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  balance: number;
  role: GroupRole;
  icon: string;
  nextAuctionLabel: string;
};

export type GroupMembership = {
  user: User;
  role: GroupRole;
  balance: number;
};

export type GroupInvitation = {
  id: string;
  groupId: string;
  groupName: string;
  groupIcon: string;
  inviterName: string;
  invitedAtLabel: string;
  memberCount: number;
};


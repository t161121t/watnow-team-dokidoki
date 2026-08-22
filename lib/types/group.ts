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

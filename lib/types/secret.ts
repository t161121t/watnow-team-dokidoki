export type SecretCategory = "恋愛" | "黒歴史" | "趣味" | "特技" | "その他";
export type SecretStatus =
  | "registered"
  | "listed"
  | "on_auction"
  | "sold"
  | "returned";
export type SecretViewRole = "owner" | "dealer" | "winner";

export type Secret = {
  id: string;
  groupId: string;
  ownerName: string;
  ownerInitials: string;
  summary: string;
  body: string;
  category: SecretCategory;
  rarity: 1 | 2 | 3 | 4 | 5;
  value: number;
  status: SecretStatus;
  viewRole: SecretViewRole;
  registeredAtLabel: string;
  remainingLabel?: string;
  soldPrice?: number;
};

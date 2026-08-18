// prisma/sql/groups/*.sql のRPCが返す行の型（生SQLのカラム名=snake_case）。
// UIに渡す前提のcamelCase変換はactions.ts側の責務にしない
// （このドメインはまだUI未接続のため、変換方針はUI接続時に決める）。

export type GroupRow = {
  id: string;
  name: string;
  icon_path: string | null;
  created_by: string;
  auction_open_seconds: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
};

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: "member" | "admin";
  status: "invited" | "active" | "left" | "kicked";
  invited_by: string;
  invited_at: string;
  joined_at: string | null;
  left_at: string | null;
};

export type UserSearchResultRow = {
  id: string;
  nickname: string;
  avatar_path: string | null;
};

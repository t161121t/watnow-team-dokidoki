// prisma/sql/groups/*.sql のRPCが返す行の型（生SQLのカラム名=snake_case）。
// UIに渡す前提のcamelCase変換はactions.ts側の責務にしない
// （このドメインはまだUI未接続のため、変換方針はUI接続時に決める）。
//
// timestamptz列は$queryRaw経由だとstringではなくDateオブジェクトとして
// 返ってくる（実DBで確認済み。2026-08-19レビュー指摘）。

export type GroupRow = {
  id: string;
  name: string;
  icon_path: string | null;
  created_by: string;
  auction_open_seconds: number;
  created_at: Date;
  updated_at: Date;
  archived_at: Date | null;
};

export type GroupMemberRow = {
  group_id: string;
  user_id: string;
  role: "member" | "admin";
  status: "invited" | "active" | "left" | "kicked";
  invited_by: string;
  invited_at: Date;
  joined_at: Date | null;
  left_at: Date | null;
};

export type GroupInviteLinkRow = {
  group_id: string;
  code: string;
  created_by: string;
  created_at: Date;
};

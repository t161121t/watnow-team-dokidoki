// prisma/sql/groups/*.sql のRPCが返す行の型（生SQLのカラム名=snake_case）。
// UI接続時（issue #71）にsnake_case→camelCase変換は導入しないことに決めた。
// componentsからはこのsnake_caseのまま参照する（変換層を挟むほどの複雑さが
// まだないため。必要になったら再検討する）。
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

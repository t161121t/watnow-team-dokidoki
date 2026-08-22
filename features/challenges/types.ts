// prisma/sql/challenges/*.sql のRPCが返す行の型（生SQLのカラム名=snake_case）。
// ドメイン間import禁止のため、featuresの他ドメインと定義が重複するが意図的
// （features/README.md参照）。timestamptz列は$queryRaw経由だとDateオブジェクトで
// 返る（features/groups/types.tsのレビュー指摘で確認済み）。
//
// 一覧系（getGroupChallenges/getGroupChallengeAttempts）はRPC/Viewを経由しない
// 素のPrismaクエリ（features/wallet/server/get-balance.tsと同じパターン）のため、
// ここには型を置かず生成されたPrisma Client の型（@/app/generated/prisma/client）
// をそのまま使う。

export type ChallengeStatus = "active" | "archived";

export type ChallengeRow = {
  id: string;
  group_id: string | null;
  created_by: string | null;
  title: string;
  description: string | null;
  reward_points: number;
  requires_evidence_photo: boolean;
  cooldown_seconds: number | null;
  status: ChallengeStatus;
  created_at: Date;
  updated_at: Date;
};

export type AttemptStatus = "pending" | "approved" | "rejected" | "awarded" | "canceled";

export type ApprovalDecision = "approved" | "rejected";

export type ChallengeAttemptRow = {
  id: string;
  group_id: string;
  challenge_id: string;
  user_id: string;
  status: AttemptStatus;
  evidence_path: string | null;
  reward_points: number | null;
  awarded_ledger_id: string | null;
  reviewed_by: string | null;
  reviewed_decision: ApprovalDecision | null;
  reviewed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  awarded_at: Date | null;
};

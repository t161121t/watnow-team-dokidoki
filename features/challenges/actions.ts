"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import {
  AVATAR_EXTENSIONS,
  createChallengeEvidenceSignedReadUrl,
  createChallengeEvidenceUploadUrl as createChallengeEvidenceUploadUrlInStorage,
} from "@/lib/supabase/storage";
import { submitChallenge as submitChallengeInDb } from "@/features/challenges/server/submit-challenge";
import { approveChallenge as approveChallengeInDb } from "@/features/challenges/server/approve-challenge";
import { createGroupChallenge as createGroupChallengeInDb } from "@/features/challenges/server/create-group-challenge";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("ログインが必要です");
  }
}

const challengeEvidenceUploadSchema = z.object({
  extension: z.enum(AVATAR_EXTENSIONS),
});

/**
 * チャレンジ挑戦（⑧）の証拠写真アップロード用の署名付きURLを発行する。
 * UI側は返り値の`signedUrl`に画像ファイルを直接PUTし、その`path`を
 * submitChallengeの`evidencePath`に渡す想定（features/auth/actionsの
 * createAvatarUploadUrlと同じパターン）。
 */
export async function createChallengeEvidenceUploadUrl(input: { extension: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = challengeEvidenceUploadSchema.parse(input);
  return createChallengeEvidenceUploadUrlInStorage(userId, parsed.extension);
}

const challengeEvidenceReadSchema = z.object({ path: z.string().trim().min(1) });

/**
 * 承認待ちキュー（⑧）で証拠写真を表示するための一時的な署名付きURLを発行する。
 * privateバケットのRLS（本人 or 同じgroupのアクティブメンバーのみ）を満たさなければ
 * nullが返る（lib/supabase/storage.ts参照）。
 */
export async function getChallengeEvidenceSignedUrl(input: { path: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = challengeEvidenceReadSchema.parse(input);
  return createChallengeEvidenceSignedReadUrl(parsed.path);
}

/**
 * PostgreSQL FunctionのRAISE EXCEPTIONはPrismaの生SQLエラーとして技術的な
 * メッセージ（P0001等）で返ってくるため、UI表示用の分類コードに丸める。
 * 元のRAISE EXCEPTIONメッセージ一覧はprisma/sql/challenges/002_submit_and_review.sql
 * 参照。throwではなく戻り値のstatusで表現する（features/auctions/actions.ts
 * のplaceBid等と同じパターン。本番ビルドではServer Actionのエラーメッセージが
 * サニタイズされ、throwした日本語メッセージ自体がクライアントに届かなくなる
 * ため。2026-08-23、ユーザー報告を受けて発覚）。日本語文言はクライアント側の
 * 呼び出し元コンポーネントで持つ。
 */
export type SubmitChallengeErrorStatus =
  | "not_a_member"
  | "challenge_not_available"
  | "evidence_required"
  | "invalid_evidence_path"
  | "in_cooldown"
  | "pending_attempt_exists"
  | "unknown_error";

function mapSubmitChallengeErrorStatus(message: string): SubmitChallengeErrorStatus {
  if (message.includes("not a member")) return "not_a_member";
  if (message.includes("challenge not found or not available")) return "challenge_not_available";
  if (message.includes("evidence photo is required")) return "evidence_required";
  if (message.includes("evidence_path must belong") || message.includes("evidence_path does not exist")) {
    return "invalid_evidence_path";
  }
  if (message.includes("still in cooldown")) return "in_cooldown";
  if (message.includes("pending attempt already exists")) return "pending_attempt_exists";
  return "unknown_error";
}

export type SubmitChallengeResult = { status: "ok" } | { status: SubmitChallengeErrorStatus };

const submitChallengeSchema = z.object({
  groupId: z.string().uuid(),
  challengeId: z.string().uuid(),
  evidencePath: z.string().trim().min(1).nullable().default(null),
});

/** チャレンジ挑戦（⑧）。submit_challenge RPC経由。 */
export async function submitChallenge(input: {
  groupId: string;
  challengeId: string;
  evidencePath?: string | null;
}): Promise<SubmitChallengeResult> {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = submitChallengeSchema.parse(input);
  try {
    await submitChallengeInDb(userId, parsed.groupId, parsed.challengeId, parsed.evidencePath);
    return { status: "ok" };
  } catch (error) {
    return { status: mapSubmitChallengeErrorStatus(error instanceof Error ? error.message : "") };
  }
}

export type ApproveChallengeErrorStatus =
  | "attempt_not_found"
  | "not_authorized"
  | "cannot_review_own"
  | "unknown_error";

function mapApproveChallengeErrorStatus(message: string): ApproveChallengeErrorStatus {
  if (message.includes("attempt not found or already reviewed")) return "attempt_not_found";
  if (message.includes("not authorized")) return "not_authorized";
  if (message.includes("cannot review your own attempt")) return "cannot_review_own";
  return "unknown_error";
}

export type ApproveChallengeResult = { status: "ok" } | { status: ApproveChallengeErrorStatus };

const approveChallengeSchema = z.object({
  attemptId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

/** チャレンジ承認/却下。approve_challenge RPC経由。 */
export async function approveChallenge(input: {
  attemptId: string;
  decision: "approved" | "rejected";
}): Promise<ApproveChallengeResult> {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = approveChallengeSchema.parse(input);
  try {
    await approveChallengeInDb(userId, parsed.attemptId, parsed.decision);
    return { status: "ok" };
  } catch (error) {
    return { status: mapApproveChallengeErrorStatus(error instanceof Error ? error.message : "") };
  }
}

const createGroupChallengeSchema = z.object({
  groupId: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().default(null),
  rewardPoints: z.number().int().min(0),
  requiresEvidencePhoto: z.boolean().default(false),
  cooldownSeconds: z.number().int().positive().nullable().default(null),
});

/** グループ独自チャレンジの作成（幹事）。create_group_challenge RPC経由。 */
export async function createGroupChallenge(input: {
  groupId: string;
  title: string;
  description?: string | null;
  rewardPoints: number;
  requiresEvidencePhoto?: boolean;
  cooldownSeconds?: number | null;
}) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = createGroupChallengeSchema.parse(input);
  return createGroupChallengeInDb(
    userId,
    parsed.groupId,
    parsed.title,
    parsed.description,
    parsed.rewardPoints,
    parsed.requiresEvidencePhoto,
    parsed.cooldownSeconds,
  );
}

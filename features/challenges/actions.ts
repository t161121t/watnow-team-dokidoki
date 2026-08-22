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
}) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = submitChallengeSchema.parse(input);
  return submitChallengeInDb(userId, parsed.groupId, parsed.challengeId, parsed.evidencePath);
}

const approveChallengeSchema = z.object({
  attemptId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

/** チャレンジ承認/却下。approve_challenge RPC経由。 */
export async function approveChallenge(input: {
  attemptId: string;
  decision: "approved" | "rejected";
}) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = approveChallengeSchema.parse(input);
  return approveChallengeInDb(userId, parsed.attemptId, parsed.decision);
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

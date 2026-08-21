"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import { submitChallenge as submitChallengeInDb } from "@/features/challenges/server/submit-challenge";
import { approveChallenge as approveChallengeInDb } from "@/features/challenges/server/approve-challenge";
import { createGroupChallenge as createGroupChallengeInDb } from "@/features/challenges/server/create-group-challenge";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("ログインが必要です");
  }
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

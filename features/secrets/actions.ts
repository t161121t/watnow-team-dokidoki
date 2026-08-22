"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import { registerSecret as registerSecretInDb } from "@/features/secrets/server/register-secret";
import { updateSecretBeforeListing as updateSecretBeforeListingInDb } from "@/features/secrets/server/update-secret-before-listing";
import { deleteSecretBeforeListing as deleteSecretBeforeListingInDb } from "@/features/secrets/server/delete-secret-before-listing";
import { listSecretForAuction as listSecretForAuctionInDb } from "@/features/secrets/server/list-secret-for-auction";
import { getMySecretCollection as getMySecretCollectionInDb } from "@/features/secrets/server/get-my-secret-collection";
import { listMyWinnings as listMyWinningsInDb } from "@/features/secrets/server/list-my-winnings";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("ログインが必要です");
  }
}

const registerSecretSchema = z.object({
  groupId: z.string().uuid(),
  body: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  category: z.string().trim().min(1),
  rarity: z.number().int().min(1).max(5),
  askingPrice: z.number().int().min(0),
});

/** 秘密登録（⑦）。register_secret RPC経由。 */
export async function registerSecret(input: {
  groupId: string;
  body: string;
  summary: string;
  category: string;
  rarity: number;
  askingPrice: number;
}) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = registerSecretSchema.parse(input);
  return registerSecretInDb(
    userId,
    parsed.groupId,
    parsed.body,
    parsed.summary,
    parsed.category,
    parsed.rarity,
    parsed.askingPrice,
  );
}

const updateSecretBeforeListingSchema = z.object({
  secretId: z.string().uuid(),
  body: z.string().trim().min(1).optional(),
  summary: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  rarity: z.number().int().min(1).max(5).optional(),
  askingPrice: z.number().int().min(0).optional(),
});

/**
 * 秘密リスト（⑬）でのregistered状態の秘密編集。update_secret_before_listing RPC経由。
 * 出品済み（registered以外）になっていると RPC側が拒否する。
 */
export async function updateSecretBeforeListing(input: {
  secretId: string;
  body?: string;
  summary?: string;
  category?: string;
  rarity?: number;
  askingPrice?: number;
}) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const { secretId, ...rest } = updateSecretBeforeListingSchema.parse(input);
  return updateSecretBeforeListingInDb(userId, secretId, rest);
}

const secretIdSchema = z.object({ secretId: z.string().uuid() });

/** 秘密リスト（⑬）でのregistered状態の秘密削除。delete_secret_before_listing RPC経由。 */
export async function deleteSecretBeforeListing(input: { secretId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = secretIdSchema.parse(input);
  return deleteSecretBeforeListingInDb(userId, parsed.secretId);
}

const secretGroupItemIdSchema = z.object({
  secretGroupItemId: z.string().uuid(),
});

/**
 * 秘密リスト（⑬）での出品実施。list_secret_for_auction RPC経由。
 * ディーラーのランダム選抜・前払いcreditもこのRPCの中で行われる。
 */
export async function listSecretForAuction(input: { secretGroupItemId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = secretGroupItemIdSchema.parse(input);
  return listSecretForAuctionInDb(userId, parsed.secretGroupItemId);
}

const getMySecretCollectionSchema = z.object({
  groupId: z.string().uuid().optional(),
});

/** マイページ（⑭）のコレクション一覧。my_secret_collection_view経由。 */
export async function getMySecretCollection(input: { groupId?: string } = {}) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = getMySecretCollectionSchema.parse(input);
  return getMySecretCollectionInDb(userId, parsed.groupId);
}

const listMyWinningsSchema = z.object({ groupId: z.string().uuid() });

/**
 * マイページ（⑭）の「落札コレクション」。secretsドメインの読み取りは
 * app/groups/[groupId]/me/page.tsxからここを経由して取得する（usersドメインの
 * ProfileScreenから見るとcross-domainのread。features/auctions/actionsの
 * getMyDealerAuctionsと同じ理由）。
 */
export async function listMyWinnings(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = listMyWinningsSchema.parse(input);
  return listMyWinningsInDb(userId, parsed.groupId);
}


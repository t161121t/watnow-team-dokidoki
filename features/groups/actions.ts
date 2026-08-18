"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import {
  AVATAR_EXTENSIONS,
  createAvatarUploadUrl,
} from "@/lib/supabase/storage";

const iconUploadSchema = z.object({
  extension: z.enum(AVATAR_EXTENSIONS),
});

/**
 * グループ作成（④）でのアイコン画像アップロード用に、署名付きアップロードURLを
 * 発行する。UI側は返り値の`signedUrl`に画像ファイルを直接PUTし、その`path`を
 * グループ作成時（issue #38で実装）の`icon_path`に渡す想定。
 *
 * avatarsバケットをuser avatarと共用している（prisma/sql/common/004_avatars_storage.sql）。
 * pathは呼び出しユーザー自身のフォルダ固定（RLSの制約）で、グループとの紐付けは
 * まだ存在しないグループのidではなく、アップロード者のuserIdで行う。
 */
export async function createGroupIconUploadUrl(input: { extension: string }) {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("ログインが必要です");
  }

  const parsed = iconUploadSchema.parse(input);
  return createAvatarUploadUrl(userId, parsed.extension);
}

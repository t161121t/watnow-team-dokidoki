import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AVATARS_BUCKET = "avatars";

export const AVATAR_EXTENSIONS = ["png", "jpg", "jpeg", "webp"] as const;
export type AvatarExtension = (typeof AVATAR_EXTENSIONS)[number];

/**
 * avatarsバケット（prisma/sql/common/004_avatars_storage.sql）への署名付き
 * アップロードURLを発行する。user avatar / group icon 共用で、pathは呼び出し元が
 * 自分のuserIdをフォルダ名にして渡す前提（RLSが"{auth.uid()}/*"のみ許可するため）。
 * どちらの用途か（users.avatar_path / groups.icon_path）はここでは判断しない。
 *
 * 認証確認は呼び出し元のfeatures/<domain>/actions.tsで行うこと（このファイルは
 * lib/なのでドメインロジック・認証確認は持たない）。
 */
export async function createAvatarUploadUrl(
  userId: string,
  extension: AvatarExtension,
) {
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error("アップロードURLの発行に失敗しました");
  }

  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

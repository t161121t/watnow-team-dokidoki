import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const AVATARS_BUCKET = "avatars";
const CHALLENGE_EVIDENCE_BUCKET = "challenge-evidence";

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

/**
 * challenge-evidenceバケット（prisma/sql/challenges/003_evidence_storage.sql）への
 * 署名付きアップロードURLを発行する。avatarsと違いprivateバケットのため、
 * 提出後の閲覧にはcreateChallengeEvidenceSignedReadUrlが別途必要
 * （認証確認は呼び出し元のfeatures/challenges/actions.tsで行うこと）。
 */
export async function createChallengeEvidenceUploadUrl(
  userId: string,
  extension: AvatarExtension,
) {
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(CHALLENGE_EVIDENCE_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error("アップロードURLの発行に失敗しました");
  }

  return { path: data.path, token: data.token, signedUrl: data.signedUrl };
}

/**
 * challenge-evidenceの証拠写真を閲覧するための一時的な署名付きURLを発行する。
 * privateバケットなのでstorage.objectsのRLS（本人 or 同じgroupのアクティブ
 * メンバーのみ）を通らないとSupabase側でエラーになる。呼び出し元
 * （createSupabaseServerClientが積んでいるcookieのユーザー）がその条件を
 * 満たさない場合はnullを返す（features/challenges/serverから、承認対象で
 * ない写真は見せない設計と二重に守られる形）。
 */
export async function createChallengeEvidenceSignedReadUrl(
  path: string,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.storage
    .from(CHALLENGE_EVIDENCE_BUCKET)
    .createSignedUrl(path, 3600);

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}

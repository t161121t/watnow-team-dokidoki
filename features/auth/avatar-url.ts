/**
 * avatarsバケット（prisma/sql/common/004_avatars_storage.sql）はpublicのため、
 * 署名なしの直接URLで配信できる。features/groups/icon.tsのpublicAvatarUrlと
 * 同じ関数（user avatar側。Client Componentから使うためserver-onlyでは
 * ないファイルに置く）。
 */
export function publicAvatarUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

/**
 * groups.icon_pathの表示方法を判定する（issue #71、グループ作成UI）。
 * アップロード画像のpathは常に"{userId}/{uuid}.{拡張子}"の形（"/"を含む。
 * lib/supabase/storage.ts参照）、絵文字ピッカーで選んだ場合はiconPathへ
 * 絵文字そのものを保存する（"/"を含まない）ため、この違いで判別する。
 * DBに新規カラムを増やさずに両方式を共存させるための割り切り。
 */
export function isUploadedIconPath(iconPath: string): boolean {
  return iconPath.includes("/");
}

/**
 * avatarsバケット（prisma/sql/common/004_avatars_storage.sql）はpublicのため、
 * 署名なしの直接URLで配信できる。
 */
export function publicAvatarUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

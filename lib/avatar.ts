const AVATAR_TONES = ["pink", "blue", "violet", "amber"] as const;
export type AvatarTone = (typeof AVATAR_TONES)[number];

/**
 * 実データのユーザーにはavatarColorの概念がない（components/ui/avatar.tsxの
 * モック用フィールド）ため、userIdから決定的に色を割り当てる
 * （同じユーザーは常に同じ色になる）。
 */
export function avatarToneFromUserId(userId: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** ニックネームの先頭1文字（絵文字・サロゲートペア対応）を大文字にして使う。 */
export function initialsFromNickname(nickname: string): string {
  const [first] = Array.from(nickname.trim());
  return (first ?? "?").toUpperCase();
}

/**
 * avatarsバケット（prisma/sql/common/004_avatars_storage.sql）はpublicのため、
 * 署名なしの直接URLで配信できる。user avatar / group icon共用。
 */
export function publicAvatarUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${path}`;
}

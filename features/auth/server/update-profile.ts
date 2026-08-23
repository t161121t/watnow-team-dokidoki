import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * アカウント設定（⑮）でのニックネーム・アイコン変更。usersのUPDATEは
 * users_update_self（prisma/sql/groups/001_rls.sql）で本人に許可済みのため、
 * RPCを新設せずPrisma経由の直接UPDATEで足りる
 * （prisma/sql/auth/001_create_profile.sqlのコメント参照）。
 */
export async function updateProfile(
  userId: string,
  input: { nickname?: string; avatarPath?: string },
) {
  return withRlsContext(userId, (tx) =>
    tx.user.update({ where: { id: userId }, data: input }),
  );
}

import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { MySecretCollectionRow } from "@/features/secrets/types";

/**
 * my_secret_collection_view（落札した秘密 + 自分が出品した秘密）。
 * groupIdを渡すとそのグループのみに絞る。省略時は全グループ横断
 * （⑭マイページの「合算タブ」用。ポイント自体はグループ横断合算しないが、
 * コレクション一覧の見せ方はグループ横断も想定されているため）。
 */
export async function getMySecretCollection(
  userId: string,
  groupId?: string,
): Promise<MySecretCollectionRow[]> {
  return withRlsContext(userId, (tx) =>
    groupId
      ? tx.$queryRaw<MySecretCollectionRow[]>`
          SELECT * FROM my_secret_collection_view WHERE group_id = ${groupId}::uuid
        `
      : tx.$queryRaw<MySecretCollectionRow[]>`SELECT * FROM my_secret_collection_view`,
  );
}

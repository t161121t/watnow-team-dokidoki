import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * 秘密リスト（⑬）「自分の秘密」タブ用。自分がowner（secrets.owner_id）の
 * secret_group_itemsを、対応するsecrets（本文/カテゴリ等）と合わせて返す。
 * RLS（secrets_select_owner_or_winner）で本人分のみ結合できる。
 */
export async function listMySecrets(userId: string, groupId: string) {
  return withRlsContext(userId, (tx) =>
    tx.secretGroupItem.findMany({
      where: { groupId, secret: { ownerId: userId } },
      orderBy: { createdAt: "desc" },
      include: { secret: true },
    }),
  );
}

import "server-only";
import { withRlsContext } from "@/lib/db/rls";

/**
 * 秘密リスト（⑬）「自分の秘密」タブからの関連秘密詳細用。自分がownerの
 * secret_group_item 1件を、secrets（本文含む）と合わせて返す。
 * 自分の所有物でなければnull（他人の秘密詳細をowner視点で覗けないようにする）。
 */
export async function getMySecretItem(userId: string, secretGroupItemId: string) {
  return withRlsContext(userId, (tx) =>
    tx.secretGroupItem.findFirst({
      where: { id: secretGroupItemId, secret: { ownerId: userId } },
      include: { secret: true },
    }),
  );
}

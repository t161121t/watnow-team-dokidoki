import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { SecretGroupItemRow } from "@/features/secrets/types";

export async function registerSecret(
  userId: string,
  groupId: string,
  body: string,
  title: string,
  summary: string,
  category: string,
  rarity: number,
  askingPrice: number,
): Promise<SecretGroupItemRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<SecretGroupItemRow[]>`
      SELECT * FROM register_secret(${groupId}::uuid, ${body}, ${title}, ${summary}, ${category}, ${rarity}::int, ${askingPrice}::int)
    `,
  );
  return rows[0];
}

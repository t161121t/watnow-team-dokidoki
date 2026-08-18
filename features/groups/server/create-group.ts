import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupRow } from "@/features/groups/types";

export async function createGroup(
  userId: string,
  name: string,
  iconPath: string | null,
): Promise<GroupRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<GroupRow[]>`SELECT * FROM create_group(${name}, ${iconPath})`,
  );
  return rows[0];
}

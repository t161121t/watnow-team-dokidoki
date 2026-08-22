import "server-only";
import { withRlsContext } from "@/lib/db/rls";
import type { GroupMemberRow } from "@/features/groups/types";

/**
 * 招待URLのコードでグループに参加する（issue #71）。旧invite_member+
 * accept_inviteの2段階を1つのセルフサービスRPCに統合した
 * （join_group_via_invite_link、prisma/sql/groups/003_group_invite_links.sql）。
 */
export async function joinViaInviteLink(
  userId: string,
  code: string,
): Promise<GroupMemberRow> {
  const rows = await withRlsContext(userId, (tx) =>
    tx.$queryRaw<GroupMemberRow[]>`SELECT * FROM join_group_via_invite_link(${code})`,
  );
  return rows[0];
}

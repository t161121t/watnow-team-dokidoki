import "server-only";
import { z } from "zod";
import { withRlsContext } from "@/lib/db/rls";

const groupIdSchema = z.string().uuid();

export type MyGroupSummary = {
  id: string;
  name: string;
  iconPath: string | null;
  role: "member" | "admin";
  balance: number;
};

/**
 * グループホーム（⑥）用。1グループ分のname・iconPath・自分のrole・自分の
 * walletのbalanceを合成して返す。所属していない/存在しないgroupIdならnull
 * （get-my-groups-summary.tsと同じ理由でwalletテーブルを直接引く）。
 */
export async function getMyGroupSummary(
  userId: string,
  groupId: string,
): Promise<MyGroupSummary | null> {
  const parsedGroupId = groupIdSchema.parse(groupId);

  const group = await withRlsContext(userId, (tx) =>
    tx.group.findUnique({
      where: { id: parsedGroupId },
      include: {
        members: { where: { userId, status: "active" }, select: { role: true } },
        wallets: { where: { userId }, select: { balance: true } },
      },
    }),
  );

  if (!group || group.members.length === 0) {
    return null;
  }

  return {
    id: group.id,
    name: group.name,
    iconPath: group.iconPath,
    role: group.members[0].role,
    balance: group.wallets[0]?.balance ?? 0,
  };
}

import "server-only";
import { withRlsContext } from "@/lib/db/rls";

export type MyGroupSummary = {
  id: string;
  name: string;
  iconPath: string | null;
  memberCount: number;
  role: "member" | "admin";
  balance: number;
};

/**
 * グループ一覧（④）用。所属groupそれぞれについて、一覧カード表示に要る
 * memberCount・自分のrole・自分のwalletのbalanceまで合成して返す。
 * wallet（別ドメインのテーブル）を直接引いているが、ESLintのboundariesは
 * import grafを規制するものでありテーブル参照自体は規制しない
 * （features/secrets/server/get-collection-item.tsがauctions/usersを
 * 直接引いているのと同じ考え方）。
 */
export async function getMyGroupsSummary(userId: string): Promise<MyGroupSummary[]> {
  const groups = await withRlsContext(userId, (tx) =>
    tx.group.findMany({
      where: { members: { some: { userId, status: "active" } } },
      orderBy: { createdAt: "asc" },
      include: {
        members: { where: { status: "active" }, select: { userId: true, role: true } },
        wallets: { where: { userId }, select: { balance: true } },
      },
    }),
  );

  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    iconPath: group.iconPath,
    memberCount: group.members.length,
    role: group.members.find((member) => member.userId === userId)?.role ?? "member",
    balance: group.wallets[0]?.balance ?? 0,
  }));
}

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { CreateSecretSheet } from "@/features/secrets/components/create-secret-sheet";
import { SecretCard } from "@/features/secrets/components/secret-card";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import { listMySecrets } from "@/features/secrets/server/list-my-secrets";
import { listMyWinnings } from "@/features/secrets/server/list-my-winnings";
import type { SecretGroupItemStatus, SecretListItem } from "@/features/secrets/types";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<SecretGroupItemStatus, string> = {
  registered: "登録済み",
  listed: "承認待ち",
  on_auction: "出品中",
  sold: "落札済み",
  returned: "返却済み",
  withdrawn: "取消済み",
};

/**
 * 秘密リスト（⑬）。「自分の秘密」「落札済み」は自分でserver/を直接呼んで
 * 取得する（docs/アーキテクチャ.md §1.1a、2026-08-22レビュー指摘）。
 * 「ディーラー」タブのデータ（auctionsドメイン）はドメイン境界上ここから
 * 直接読めないため、呼び出し元のpage.tsxがfeatures/auctions/actions.ts
 * 経由で取得してpropsで渡す（cross-domainのread唯一の許容経路）。
 */
export async function SecretListScreen({
  groupId,
  dealer,
  tab,
  createOpen,
}: {
  groupId: string;
  dealer: SecretListItem[];
  tab: SecretListTab;
  /** 新規登録シート（⑦）を開くか。URLクエリ`?new=1`をpage.tsxが解釈した値 */
  createOpen: boolean;
}) {
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/secrets`)}`);
  }

  const [mineRows, winningRows] = await Promise.all([
    listMySecrets(userId, groupId),
    listMyWinnings(userId, groupId),
  ]);

  // deletedAt済み（delete_secret_before_listingで論理削除済み）の秘密は
  // secret_group_items自体はregisteredのままRLSも通ってしまうため、ここで
  // 明示的に除外する（2026-08-22レビュー指摘。除外しないと出品ボタン付きで
  // 再表示され、実際に押すとRPC側で拒否されて失敗する）。
  const mine: SecretListItem[] = mineRows
    .filter((item) => item.secret.deletedAt === null)
    .map((item) => ({
      id: item.id,
      groupId,
      viewRole: "owner",
      summary: item.secret.summary,
      category: item.secret.category,
      rarity: item.secret.rarity,
      value: item.currentValue,
      badgeLabel: STATUS_LABELS[item.status],
    }));

  const collection: SecretListItem[] = winningRows.map((row) => ({
    id: row.secret_id,
    groupId,
    viewRole: "winner",
    summary: row.summary,
    category: row.category,
    rarity: row.rarity,
    value: row.final_price ?? 0,
  }));

  // タブ切り替えはURLのクエリ（?tab=...）駆動（下のLinkのreplace+scroll={false}）。
  // 一覧のタブボタンは「自分の秘密」「ディーラー」の2つのみ表示するが、
  // 秘密ビューワー（⑫）からの戻り導線（returnTab）で"collection"を指定して
  // 戻ってくるケースがあるため、その場合の表示は残す。
  const visibleSecrets = tab === "dealer" ? dealer : tab === "collection" ? collection : mine;

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="秘密リスト"
        action={
          // 新規登録シートはURLクエリ（?new=1）で開く。scroll={false}で一覧の
          // スクロール位置を保ち、ブラウザバックでもシートを閉じられる
          <NeonLink
            href={{
              pathname: `/groups/${groupId}/secrets`,
              query: { tab, new: "1" },
            }}
            scroll={false}
            variant="secondary"
            size="sm"
          >
            登録
          </NeonLink>
        }
      />

      <div className="mb-6 grid grid-cols-2 rounded-full border border-[#c038ff]/55 bg-black/65 p-1 shadow-[0_0_13px_rgba(192,56,255,0.28)]">
        {(
          [
            ["mine", "自分の秘密"],
            ["dealer", "ディーラー"],
          ] as const
        ).map(([value, label]) => (
          <Link
            key={value}
            href={{
              pathname: `/groups/${groupId}/secrets`,
              query: { tab: value },
            }}
            replace
            scroll={false}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "flex min-h-9 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white/45 transition",
              tab === value &&
                "bg-[#c038ff]/22 text-white shadow-[0_0_12px_rgba(192,56,255,0.58)]",
            )}
          >
            {label}
          </Link>
        ))}
      </div>

      {visibleSecrets.length > 0 ? (
        <div className="space-y-4">
          {visibleSecrets.map((secret) => (
            <SecretCard key={secret.id} secret={secret} listTab={tab} />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-[#c038ff]/45 bg-black/50 px-6 py-12 text-center">
          <p className="font-bold">秘密はありません</p>
        </div>
      )}
      <BottomNavigation
        items={getGroupNavigation(groupId)}
        active={tab === "collection" ? "me" : "secrets"}
      />
      <CreateSecretSheet groupId={groupId} tab={tab} open={createOpen} />
    </MobileShell>
  );
}

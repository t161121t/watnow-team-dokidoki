import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { GroupSwitchModal } from "@/features/groups/components/group-switch-modal";
import { getMyGroupsSummary } from "@/features/groups/server/get-my-groups-summary";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * グループホーム（⑥）。groupsドメイン内の読み取りは自分でserver/を直接呼ぶ
 * （docs/アーキテクチャ.md §1.1a）。dealerSection/auctionSectionは
 * それぞれ別ドメイン（secrets/auctions）の自己取得コンポーネントで、
 * feature-uiはドメインをまたいで直接importできない（ESLint boundaries）ため、
 * 呼び出し元のapp/groups/[groupId]/page.tsxで組み立ててReactNodeとして渡す。
 *
 * グループ切替（②）はページ遷移ではなくモーダル（group-switch-modal.tsx）。
 * モーダルに出す所属グループ一覧はこのRSCがgetMyGroupsSummaryで取得して
 * propsで渡す。表示中グループの情報（name/role/balance）も同じ結果から
 * 引く（以前のgetMyGroupSummaryによる単発取得を一覧取得に一本化）。
 */
export async function GroupHomeScreen({
  groupId,
  dealerSection,
  auctionSection,
}: {
  groupId: string;
  dealerSection: ReactNode;
  auctionSection: ReactNode;
}) {
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}`)}`);
  }

  const groups = await getMyGroupsSummary(userId);
  const group = groups.find((candidate) => candidate.id === groupId);
  if (!group) {
    notFound();
  }

  return (
    <MobileShell withNavigation className="pt-[58px]">
      <div className="mb-7 flex items-center justify-between gap-3">
        <GroupSwitchModal currentGroupId={group.id} groups={groups} />
        {group.role === "admin" ? (
          <NeonLink
            href={`/groups/${group.id}/manage`}
            variant="secondary"
            size="sm"
          >
            管理
          </NeonLink>
        ) : null}
      </div>

      <NeonCard className="p-5">
        <p className="text-xs font-bold text-white/50">あなたのポイント</p>
        <p className="mt-1 text-[36px] leading-none font-black tracking-tight">
          {group.balance.toLocaleString()}
          <span className="ml-1 text-base text-[#d953ff]">pt</span>
        </p>
      </NeonCard>

      {dealerSection}
      {auctionSection}
      <BottomNavigation items={getGroupNavigation(group.id)} active="home" />
    </MobileShell>
  );
}

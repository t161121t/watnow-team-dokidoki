import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { getMyGroupSummary } from "@/features/groups/server/get-my-group-summary";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

/**
 * グループホーム（⑥）。groupsドメイン内の読み取りは自分でserver/を直接呼ぶ
 * （docs/アーキテクチャ.md §1.1a）。dealerSection/auctionSectionは
 * それぞれ別ドメイン（secrets/auctions）の自己取得コンポーネントで、
 * feature-uiはドメインをまたいで直接importできない（ESLint boundaries）ため、
 * 呼び出し元のapp/groups/[groupId]/page.tsxで組み立ててReactNodeとして渡す。
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

  const group = await getMyGroupSummary(userId, groupId);
  if (!group) {
    notFound();
  }

  return (
    <MobileShell withNavigation className="pt-[58px]">
      <div className="mb-7 flex items-center justify-between gap-3">
        <Link
          href="/groups"
          aria-label={`グループ「${group.name}」からグループ一覧へ移動`}
          className="group flex min-w-0 items-center gap-1 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c038ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#090b0e]"
        >
          <h1 className="truncate text-[27px] font-bold [text-shadow:0_0_12px_rgba(208,66,255,0.9),0_0_36px_rgba(138,43,226,0.55)]">
            {group.name}
          </h1>
          <ChevronDown
            aria-hidden="true"
            className="size-6 shrink-0 text-[#d966ff] transition-transform group-hover:translate-y-0.5"
            strokeWidth={3}
          />
        </Link>
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

import type { ReactNode } from "react";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { BackButton } from "@/components/ui/back-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { getGroupNavigation } from "@/lib/navigation";
import type { Group } from "@/lib/types/group";

export function GroupHomeScreen({
  group,
  dealerSection,
  auctionSection,
}: {
  group: Group;
  dealerSection: ReactNode;
  auctionSection: ReactNode;
}) {
  return (
    <MobileShell withNavigation className="pt-[58px]">
      <div className="mb-7 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1">
          <BackButton href="/groups" aria-label="グループ一覧へ戻る" className="-ml-2" />
          <h1 className="truncate text-[27px] font-bold [text-shadow:0_0_12px_rgba(208,66,255,0.9),0_0_36px_rgba(138,43,226,0.55)]">
            {group.name}
          </h1>
        </div>
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

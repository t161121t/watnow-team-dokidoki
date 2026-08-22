"use client";

import { useState } from "react";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonCard } from "@/components/ui/neon-card";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { ActiveChallengePanel } from "@/features/challenges/components/active-challenge-panel";
import { ChallengeCard } from "@/features/challenges/components/challenge-card";
import { getGroupNavigation } from "@/lib/navigation";
import type { ActiveChallenge, Challenge } from "@/lib/types/challenge";
import type { Group } from "@/lib/types/group";

type Tab = "list" | "approval" | "active";

const tabs = [
  { value: "list", label: "一覧" },
  { value: "approval", label: "承諾" },
  { value: "active", label: "挑戦中" },
] as const;

export function ChallengeScreen({
  group,
  challenges,
  activeChallenges,
}: {
  group: Group;
  challenges: Challenge[];
  activeChallenges: ActiveChallenge[];
}) {
  const [tab, setTab] = useState<Tab>("list");
  const [activeChallengeIndex, setActiveChallengeIndex] = useState(0);
  const activeChallenge = activeChallenges[activeChallengeIndex];

  const showNextChallenge = () => {
    setActiveChallengeIndex(
      (currentIndex) => (currentIndex + 1) % activeChallenges.length,
    );
  };

  return (
    <MobileShell withNavigation>
      <ScreenHeader title="チャレンジ" />
      <SegmentedTabs
        tabs={tabs}
        value={tab}
        onValueChange={setTab}
        label="チャレンジの表示切り替え"
        className="mb-6"
      />

      {tab === "list" ? (
        <>
          <NeonCard className="mb-7 p-5">
            <p className="text-xs font-bold text-white/45">現在のポイント</p>
            <p className="mt-1 text-[30px] leading-none font-black">
              {group.balance.toLocaleString()}
              <span className="ml-1 text-sm text-[#dc52ff]">pt</span>
            </p>
          </NeonCard>

          <h2 className="mb-3 text-lg font-bold">本日のチャレンジ</h2>
          <div className="space-y-4">
            {challenges.map((challenge) => (
              <ChallengeCard key={challenge.id} challenge={challenge} />
            ))}
          </div>
        </>
      ) : null}

      {tab === "approval" ? (
        <NeonCard className="px-5 py-12 text-center">
          <p className="text-sm font-bold">承諾するチャレンジを確認できます</p>
        </NeonCard>
      ) : null}

      {tab === "active" ? (
        <ActiveChallengePanel
          challenge={activeChallenge}
          onShowNext={showNextChallenge}
          onBack={() => setTab("list")}
        />
      ) : null}

      <BottomNavigation items={getGroupNavigation(group.id)} active="challenges" />
    </MobileShell>
  );
}

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonCard } from "@/components/ui/neon-card";
import { ChallengeCard } from "@/features/challenges/components/challenge-card";
import { getGroupNavigation } from "@/lib/navigation";
import type { Challenge } from "@/lib/types/challenge";
import type { Group } from "@/lib/types/group";

export function ChallengeScreen({
  group,
  challenges,
}: {
  group: Group;
  challenges: Challenge[];
}) {
  return (
    <MobileShell withNavigation>
      <ScreenHeader title="チャレンジ" />
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
          <ChallengeCard
            key={challenge.id}
            groupId={group.id}
            challenge={challenge}
          />
        ))}
      </div>
      <BottomNavigation items={getGroupNavigation(group.id)} active="challenges" />
    </MobileShell>
  );
}

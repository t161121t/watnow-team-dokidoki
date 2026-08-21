import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { cn } from "@/lib/utils";
import type { Challenge } from "@/lib/types/challenge";

const borders: Record<Challenge["tone"], string> = {
  pink: "border-[#c038ff]/75",
  blue: "border-[#c038ff]/75",
  violet: "border-[#914dff]/70",
};

export function ChallengeCard({ challenge }: { challenge: Challenge }) {
  return (
    <NeonCard className={cn("p-4", borders[challenge.tone])}>
      <h3 className="font-bold">{challenge.title}</h3>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs font-black text-[#e692ff]">
          +{challenge.reward}pt
        </span>
        <span className="text-[10px] text-white/38">{challenge.attemptsLabel}</span>
      </div>
      <MockActionButton
        variant="secondary"
        size="sm"
        className="mt-4 w-full"
        feedback={`${challenge.reward}pt獲得しました`}
      >
        挑戦する
      </MockActionButton>
    </NeonCard>
  );
}

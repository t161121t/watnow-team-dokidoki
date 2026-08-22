import Link from "next/link";

import { neonButtonVariants } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { cn } from "@/lib/utils";

export type ChallengeCardState = "available" | "pending" | "cooldown";

export type ChallengeListItem = {
  id: string;
  title: string;
  description: string | null;
  reward: number;
  state: ChallengeCardState;
  cooldownLabel: string | null;
};

export function ChallengeCard({
  groupId,
  challenge,
}: {
  groupId: string;
  challenge: ChallengeListItem;
}) {
  const stateLabel =
    challenge.state === "pending"
      ? "承認待ち"
      : challenge.state === "cooldown"
        ? challenge.cooldownLabel
        : null;

  return (
    <Link
      href={`/groups/${groupId}/challenges/${challenge.id}`}
      className="group block focus-visible:outline-none"
    >
      <NeonCard className="flex items-center justify-between gap-3 p-4 border-[#c038ff]/75 transition group-hover:-translate-y-0.5 group-hover:border-[#d75cff] group-focus-visible:ring-2 group-focus-visible:ring-[#c038ff]">
        <div className="min-w-0">
          <h3 className="font-bold">{challenge.title}</h3>
          {challenge.description ? (
            <p className="mt-1 text-xs text-white/55">{challenge.description}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs font-black text-[#e692ff]">
              クリアで{challenge.reward}pt
            </p>
            {stateLabel ? (
              <span className="text-[10px] text-white/38">{stateLabel}</span>
            ) : null}
          </div>
        </div>
        <span
          className={cn(
            neonButtonVariants({ variant: "quiet", size: "sm" }),
            "shrink-0 rounded-md border-white/80 bg-white text-black hover:bg-white",
          )}
        >
          詳細
        </span>
      </NeonCard>
    </Link>
  );
}

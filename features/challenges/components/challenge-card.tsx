import Link from "next/link";

import { neonButtonVariants } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import type { Challenge } from "@/lib/types/challenge";
import { cn } from "@/lib/utils";

const borders: Record<Challenge["tone"], string> = {
  pink: "border-[#c038ff]/75",
  blue: "border-[#c038ff]/75",
  violet: "border-[#914dff]/70",
};

export function ChallengeCard({
  groupId,
  challenge,
}: {
  groupId: string;
  challenge: Challenge;
}) {
  return (
    <Link
      href={`/groups/${groupId}/challenges/${challenge.id}`}
      className="group block focus-visible:outline-none"
    >
      <NeonCard
        className={cn(
          "flex items-center justify-between gap-3 p-4 transition group-hover:-translate-y-0.5 group-hover:border-[#d75cff] group-focus-visible:ring-2 group-focus-visible:ring-[#c038ff]",
          borders[challenge.tone],
        )}
      >
        <div className="min-w-0">
          <h3 className="font-bold">{challenge.title}</h3>
          <p className="mt-1 text-xs text-white/55">{challenge.description}</p>
          <p className="mt-2 text-xs font-black text-[#e692ff]">
            クリアで{challenge.reward}pt
          </p>
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

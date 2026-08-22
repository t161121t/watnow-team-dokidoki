import { RefreshCw } from "lucide-react";
import Link from "next/link";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonLink } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { getGroupNavigation } from "@/lib/navigation";
import type { Challenge } from "@/lib/types/challenge";
import type { Group } from "@/lib/types/group";

export function ChallengeDetailScreen({
  group,
  challenge,
  nextChallengeId,
}: {
  group: Group;
  challenge: Challenge;
  nextChallengeId: string;
}) {
  const listHref = `/groups/${group.id}/challenges`;
  const submitHref = `/groups/${group.id}/challenges/${challenge.id}/submit`;

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="チャレンジ"
        action={
          <Link
            href={`/groups/${group.id}/challenges/${nextChallengeId}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-white/85 transition hover:text-white"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            チャレンジ切り替え
          </Link>
        }
      />

      <NeonCard className="p-4">
        <h2 className="font-bold">{challenge.title}</h2>
        <p className="mt-2 text-xs font-black text-[#e692ff]">
          クリアで{challenge.reward}pt
        </p>
      </NeonCard>

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-bold underline decoration-white/70 underline-offset-4">
          チャレンジ内容
        </h2>
        <p className="text-sm leading-6 text-white/85">{challenge.instruction}</p>
      </section>

      <div className="mt-8 space-y-3">
        <NeonLink href={submitHref} variant="primary" size="lg" className="w-full">
          進む
        </NeonLink>
        <NeonLink href={listHref} variant="primary" size="lg" className="w-full">
          戻る
        </NeonLink>
      </div>
      <BottomNavigation items={getGroupNavigation(group.id)} active="challenges" />
    </MobileShell>
  );
}

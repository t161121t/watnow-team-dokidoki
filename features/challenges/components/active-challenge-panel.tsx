import { Check, Clock3, RefreshCw } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import type { ActiveChallenge } from "@/lib/types/challenge";

export function ActiveChallengePanel({
  challenge,
  onShowNext,
  onBack,
}: {
  challenge: ActiveChallenge;
  onShowNext: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <NeonButton variant="quiet" size="sm" onClick={onShowNext}>
          <RefreshCw aria-hidden="true" className="size-4" />
          チャレンジ切り替え
        </NeonButton>
      </div>

      <NeonCard className="mb-7 p-5">
        <p className="text-sm font-bold">{challenge.frequencyLabel}</p>
        <p className="mt-1 text-sm text-white/65">
          正解で
          <span className="mx-1 font-black text-[#e692ff]">
            {challenge.reward}pt
          </span>
        </p>
      </NeonCard>

      <section aria-labelledby="approval-list-title">
        <h2 id="approval-list-title" className="mb-3 text-lg font-bold">
          承諾一覧
        </h2>
        <NeonCard className="divide-y divide-white/10 px-4">
          {challenge.approvals.map(({ member, approved }) => (
            <div
              key={member.id}
              className="flex min-h-[68px] items-center justify-between gap-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  initials={member.initials}
                  tone={member.avatarColor}
                  className="size-10"
                />
                <span className="truncate text-sm font-bold">{member.name}</span>
              </div>
              <span
                className={
                  approved
                    ? "flex items-center gap-1.5 rounded-full border border-[#c038ff]/70 bg-[#c038ff]/15 px-3 py-1.5 text-[11px] font-bold text-[#f1b2ff]"
                    : "flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[11px] font-bold text-white/45"
                }
              >
                {approved ? (
                  <Check aria-hidden="true" className="size-3.5" />
                ) : (
                  <Clock3 aria-hidden="true" className="size-3.5" />
                )}
                {approved ? "承諾済み" : "承諾待ち"}
              </span>
            </div>
          ))}
        </NeonCard>
      </section>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <NeonButton variant="quiet" onClick={onBack}>
          戻る
        </NeonButton>
        <MockActionButton variant="primary" feedback="チャレンジを完了しました">
          完了
        </MockActionButton>
      </div>
    </div>
  );
}

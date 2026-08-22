import { Avatar } from "@/components/ui/avatar";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import type { ChallengeReview } from "@/lib/types/challenge";

export function ChallengeApprovalPanel({
  review,
  onBack,
}: {
  review: ChallengeReview;
  onBack: () => void;
}) {
  return (
    <div>
      <NeonCard className="mb-7 p-5">
        <p className="text-sm font-bold">{review.frequencyLabel}</p>
        <p className="mt-1 text-sm text-white/65">
          正解で
          <span className="mx-1 font-black text-[#e692ff]">
            {review.reward}pt
          </span>
        </p>
      </NeonCard>

      <section aria-labelledby="challenge-review-title">
        <div className="mb-4 flex items-center gap-3">
          <Avatar
            initials={review.member.initials}
            tone={review.member.avatarColor}
            className="size-11"
          />
          <div>
            <p className="text-[11px] font-bold text-white/45">承諾待ち</p>
            <h2 id="challenge-review-title" className="mt-0.5 text-base font-bold">
              {review.member.name}さんのチャレンジ
            </h2>
          </div>
        </div>

        <NeonCard className="px-5 py-8 text-center">
          <p className="text-sm font-bold">{review.task}</p>
        </NeonCard>
      </section>

      <div className="mt-7 grid grid-cols-2 gap-3">
        <NeonButton variant="quiet" onClick={onBack}>
          戻る
        </NeonButton>
        <MockActionButton
          variant="primary"
          feedback={`${review.member.name}さんのチャレンジを承諾しました`}
        >
          承諾する
        </MockActionButton>
      </div>
    </div>
  );
}

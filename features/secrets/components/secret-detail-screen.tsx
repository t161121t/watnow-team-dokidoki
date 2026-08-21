import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { MockActionButton } from "@/components/ui/mock-action-button";
import { NeonCard } from "@/components/ui/neon-card";
import { StarRating } from "@/components/ui/star-rating";
import { getGroupNavigation } from "@/lib/navigation";
import type { Bid } from "@/lib/types/auction";
import type { Secret } from "@/lib/types/secret";

export function SecretDetailScreen({
  secret,
  bids,
}: {
  secret: Secret;
  bids: Bid[];
}) {
  const isDealer = secret.viewRole === "dealer";

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title={isDealer ? "ディーラー出品" : "あなたの出品"}
        backHref={`/groups/${secret.groupId}/secrets`}
      />

      <NeonCard className="p-5">
        <p className="text-[10px] text-white/40">秘密の見出し</p>
        <h2 className="mt-2 text-lg leading-7 font-bold">{secret.summary}</h2>
        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs">
          <div>
            <p className="text-white/38">カテゴリ</p>
            <p className="mt-1 font-bold">{secret.category}</p>
          </div>
          <div>
            <p className="text-white/38">レア度</p>
            <StarRating value={secret.rarity} label="レア度" className="mt-1" />
          </div>
          <div>
            <p className="text-white/38">価値</p>
            <p className="mt-1 font-bold">{secret.value}pt</p>
          </div>
        </div>
      </NeonCard>

      {!isDealer ? (
        <NeonCard className="mt-4 p-5">
          <p className="text-[10px] text-white/40">秘密の本文</p>
          <p className="mt-2 text-sm leading-6 text-white/75">{secret.body}</p>
        </NeonCard>
      ) : null}

      <section className="mt-7">
        <h2 className="mb-3 text-lg font-bold">入札履歴</h2>
        <div className="space-y-2.5">
          {bids.map((bid) => (
            <NeonCard key={bid.id} className="flex items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{bid.bidderName}</p>
                <p className="text-[10px] text-white/38">{bid.placedAtLabel}</p>
              </div>
              <p className="font-black">{bid.amount.toLocaleString()}pt</p>
            </NeonCard>
          ))}
        </div>
      </section>

      {isDealer ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <MockActionButton variant="danger" feedback="差し戻しました">
            差し戻す
          </MockActionButton>
          <MockActionButton feedback="承認しました">承認する</MockActionButton>
        </div>
      ) : null}
      <BottomNavigation items={getGroupNavigation(secret.groupId)} active="secrets" />
    </MobileShell>
  );
}

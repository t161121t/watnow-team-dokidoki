import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonLink } from "@/components/ui/neon-button";
import { getGroupNavigation } from "@/lib/navigation";
import type { Secret } from "@/lib/types/secret";

export function SecretViewerScreen({ secret }: { secret: Secret }) {
  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="秘密ビューワー"
        backHref={`/groups/${secret.groupId}/secrets`}
      />

      <h2 className="mb-5 text-center text-xl font-bold [text-shadow:0_0_12px_rgba(208,66,255,0.75)]">
        あなたが落札しました！
      </h2>

      <NeonCard className="overflow-hidden">
        <div className="border-b border-white/10 bg-[#c038ff]/8 p-5">
          <p className="text-[10px] text-white/40">秘密の見出し</p>
          <h3 className="mt-2 text-lg leading-7 font-bold">{secret.summary}</h3>
        </div>
        <div className="p-5">
          <p className="text-[10px] text-[#65aaff]">秘密の本文</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/82">
            {secret.body}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs">
            <div>
              <p className="text-white/38">カテゴリ</p>
              <p className="mt-1 font-bold">{secret.category}</p>
            </div>
            <div>
              <p className="text-white/38">レア度</p>
              <p className="mt-1 font-bold">{secret.rarity}</p>
            </div>
          </div>
        </div>
      </NeonCard>

      <NeonCard className="mt-4 grid grid-cols-3 gap-2 p-4 text-center text-[10px]">
        <div>
          <p className="text-white/38">出品者</p>
          <p className="mt-1 font-bold">{secret.ownerName}</p>
        </div>
        <div>
          <p className="text-white/38">登録日</p>
          <p className="mt-1 font-bold">8月10日</p>
        </div>
        <div>
          <p className="text-white/38">落札価格</p>
          <p className="mt-1 font-bold">{secret.soldPrice ?? secret.value}pt</p>
        </div>
      </NeonCard>

      <NeonLink
        href={`/groups/${secret.groupId}/secrets`}
        size="lg"
        className="mt-6 w-full"
      >
        秘密リストへ戻る
      </NeonLink>
      <BottomNavigation items={getGroupNavigation(secret.groupId)} active="secrets" />
    </MobileShell>
  );
}

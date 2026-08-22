import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonCard } from "@/components/ui/neon-card";
import { StarRating } from "@/components/ui/star-rating";
import { getCollectionItem } from "@/features/secrets/server/get-collection-item";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import { getGroupNavigation } from "@/lib/navigation";
import { getCurrentUserId } from "@/lib/supabase/server";

function formatDateLabel(date: Date | null): string | null {
  if (!date) return null;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 秘密ビューワー（⑫、落札後）。読み取り専用データは自分でserver/を直接呼んで
 * 取得する（docs/アーキテクチャ.md §1.1a: RSCのreadはactions.tsを経由しない。
 * 2026-08-22レビュー指摘）。groupId/secretIdは秘密リスト/マイページ側がまだ
 * モックデータのままでUUIDでないIDを渡してくることがあるため、ここで先に
 * 弾いて404にする。
 */
export async function SecretViewerScreen({
  groupId,
  secretId,
  returnTab,
}: {
  groupId: string;
  secretId: string;
  returnTab: SecretListTab;
}) {
  if (!z.string().uuid().safeParse(groupId).success || !z.string().uuid().safeParse(secretId).success) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(
      `/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/collection/${secretId}`)}`,
    );
  }

  const item = await getCollectionItem(userId, groupId, secretId);
  if (!item) {
    notFound();
  }

  const secret = {
    groupId,
    summary: item.summary,
    body: item.body,
    category: item.category,
    rarity: item.rarity,
    ownerName: item.seller_nickname ?? "不明",
    finalPrice: item.final_price,
    grantedAtLabel: formatDateLabel(item.granted_at),
  };

  const backHref = `/groups/${groupId}/secrets?tab=${returnTab}`;

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="秘密ビューワー"
        backHref={backHref}
      />

      <h2 className="mb-5 text-center text-xl font-bold [text-shadow:0_0_12px_rgba(208,66,255,0.75)]">
        あなたが落札しました！
      </h2>

      <NeonCard className="overflow-hidden">
        <div className="border-b border-white/10 p-5">
          <p className="text-[10px] text-white/40">秘密の見出し</p>
          <h3 className="mt-2 text-lg leading-7 font-bold">{secret.summary}</h3>
        </div>
        <div className="p-5">
          <p className="text-[10px] text-[#e591ff]">秘密の本文</p>
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
              <StarRating value={secret.rarity} label="レア度" className="mt-1" />
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
          <p className="text-white/38">落札日</p>
          <p className="mt-1 font-bold">{secret.grantedAtLabel ?? "-"}</p>
        </div>
        <div>
          <p className="text-white/38">落札価格</p>
          <p className="mt-1 font-bold">
            {secret.finalPrice !== null ? `${secret.finalPrice.toLocaleString()}pt` : "-"}
          </p>
        </div>
      </NeonCard>

      <BottomNavigation
        items={getGroupNavigation(groupId)}
        active={returnTab === "collection" ? "me" : "secrets"}
      />
    </MobileShell>
  );
}

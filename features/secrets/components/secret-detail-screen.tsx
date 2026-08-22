"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { StarRating } from "@/components/ui/star-rating";
import { approveDealerAssignment, declineDealer } from "@/features/auctions/actions";
import type { DealerActionErrorStatus } from "@/features/auctions/actions";
import { listSecretForAuction } from "@/features/secrets/actions";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import { getGroupNavigation } from "@/lib/navigation";

const DEALER_ACTION_ERROR_MESSAGES: Record<DealerActionErrorStatus, string> = {
  not_authorized: "この操作を行う権限がありません",
  no_other_eligible_dealer: "他に割り当て可能なディーラーがいません",
  already_processed: "この案件は既に処理済みです",
  unknown_error: "操作に失敗しました",
};

export type SecretDetailData = {
  groupId: string;
  secretGroupItemId: string;
  auctionId: string | null;
  viewRole: "owner" | "dealer";
  summary: string;
  body: string | null;
  category: string;
  rarity: number;
  statusLabel: string;
  canListForAuction: boolean;
  canApproveOrDecline: boolean;
  bids: { bidderNickname: string; amount: number }[];
};

export function SecretDetailScreen({
  secret,
  returnTab,
}: {
  secret: SecretDetailData;
  returnTab: SecretListTab;
}) {
  const router = useRouter();
  const isDealer = secret.viewRole === "dealer";
  const backHref = `/groups/${secret.groupId}/secrets?tab=${returnTab}`;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const handleListForAuction = async () => {
    setIsSubmitting(true);
    try {
      await listSecretForAuction({ secretGroupItemId: secret.secretGroupItemId });
      router.refresh();
    } catch {
      setMessage("出品に失敗しました");
      setIsSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!secret.auctionId) return;
    setIsSubmitting(true);
    // throw/error.messageの文字列比較には依存しない（本番ビルドではServer
    // Actionのエラーメッセージがサニタイズされ判定できなくなるため。
    // 2026-08-23、ユーザー報告で発覚）。approveDealerAssignmentは例外を
    // 投げず、戻り値のstatusで成功/失敗理由を表現する。
    const result = await approveDealerAssignment({ auctionId: secret.auctionId });
    if (result.status === "ok") {
      router.refresh();
    } else {
      setMessage(DEALER_ACTION_ERROR_MESSAGES[result.status]);
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!secret.auctionId) return;
    setIsSubmitting(true);
    const result = await declineDealer({ auctionId: secret.auctionId });
    if (result.status === "ok") {
      router.push(backHref);
    } else {
      setMessage(DEALER_ACTION_ERROR_MESSAGES[result.status]);
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title={isDealer ? "ディーラー出品" : "あなたの出品"}
        backHref={backHref}
      />

      <NeonCard className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] text-white/40">秘密の見出し</p>
          <span className="text-[10px] font-bold text-[#e591ff]">{secret.statusLabel}</span>
        </div>
        <h2 className="text-lg leading-7 font-bold">{secret.summary}</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
          <div>
            <p className="text-white/38">カテゴリ</p>
            <p className="mt-1 font-bold">{secret.category}</p>
          </div>
          <div>
            <p className="text-white/38">レア度</p>
            <StarRating value={secret.rarity} label="レア度" className="mt-1" />
          </div>
        </div>
      </NeonCard>

      {secret.body !== null ? (
        <NeonCard className="mt-4 p-5">
          <p className="text-[10px] text-white/40">秘密の本文</p>
          <p className="mt-2 text-sm leading-6 text-white/75">{secret.body}</p>
        </NeonCard>
      ) : null}

      {secret.canListForAuction ? (
        <NeonButton
          size="lg"
          className="mt-6 w-full"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          onClick={handleListForAuction}
        >
          {isSubmitting ? "出品中…" : "出品する"}
        </NeonButton>
      ) : (
        <section className="mt-7">
          <h2 className="mb-3 text-lg font-bold">入札履歴</h2>
          {secret.bids.length > 0 ? (
            <div className="space-y-2.5">
              {secret.bids.map((bid, index) => (
                <NeonCard key={index} className="flex items-center gap-3 p-3.5">
                  <p className="min-w-0 flex-1 truncate text-sm font-bold">
                    {bid.bidderNickname}
                  </p>
                  <p className="font-black">{bid.amount.toLocaleString()}pt</p>
                </NeonCard>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/45">まだ入札はありません</p>
          )}
        </section>
      )}

      {message ? (
        <p role="alert" className="mt-4 text-[13px] font-bold text-[#ffb4c9]">
          {message}
        </p>
      ) : null}

      {secret.canApproveOrDecline ? (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <NeonButton
            variant="danger"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={handleDecline}
          >
            差し戻す
          </NeonButton>
          <NeonButton disabled={isSubmitting} aria-busy={isSubmitting} onClick={handleApprove}>
            承認する
          </NeonButton>
        </div>
      ) : null}
      <BottomNavigation items={getGroupNavigation(secret.groupId)} active="secrets" />
    </MobileShell>
  );
}

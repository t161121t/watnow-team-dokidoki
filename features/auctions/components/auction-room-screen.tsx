"use client";

import { useEffect, useMemo, useState } from "react";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { getGroupNavigation } from "@/lib/navigation";
import type { Auction } from "@/lib/types/auction";
import type { Group } from "@/lib/types/group";

export function AuctionRoomScreen({
  group,
  auction,
}: {
  group: Group;
  auction: Auction;
}) {
  const [currentPrice, setCurrentPrice] = useState(auction.currentPrice);
  const [amount, setAmount] = useState(auction.minimumBid);
  const [bidCount, setBidCount] = useState(auction.bidCount);
  const [message, setMessage] = useState("");
  const step = 20;
  const minimum = useMemo(() => currentPrice + step, [currentPrice]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [message]);

  const submitBid = () => {
    if (amount > group.balance) {
      setMessage("ポイントが不足しています");
      return;
    }
    setCurrentPrice(amount);
    setBidCount((count) => count + 1);
    setAmount(amount + step);
    setMessage(`${amount.toLocaleString()}ptで入札しました`);
  };

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="オークション会場"
        backHref={`/groups/${group.id}/auctions`}
      />

      <div className="mb-4 flex items-center justify-between">
        <span className="rounded-full border border-[#c038ff]/60 bg-[#23052f]/80 px-3 py-1.5 text-[10px] font-bold text-[#efa9ff]">
          開催中
        </span>
        <span className="text-xs font-bold text-[#65aaff]">
          {auction.remainingLabel}
        </span>
      </div>

      <NeonCard className="p-5">
        <p className="text-[10px] text-white/40">秘密の見出し</p>
        <h2 className="mt-2 text-lg leading-7 font-bold">{auction.summary}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 text-xs">
          <div>
            <p className="text-white/40">カテゴリ</p>
            <p className="mt-1 font-bold">{auction.category}</p>
          </div>
          <div>
            <p className="text-white/40">レア度</p>
            <p className="mt-1 font-bold">{auction.rarity}</p>
          </div>
        </div>
      </NeonCard>

      <NeonCard className="mt-4 border-[#2386ff]/60 p-5 shadow-[0_0_18px_rgba(35,134,255,0.24)]">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-white/45">現在価格</p>
            <p className="mt-1 text-[34px] leading-none font-black">
              {currentPrice.toLocaleString()}
              <span className="ml-1 text-sm text-white/50">pt</span>
            </p>
          </div>
          <p className="text-xs text-white/45">入札 {bidCount}件</p>
        </div>
      </NeonCard>

      <div className="mt-7">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">入札ポイント</p>
          <p className="text-[11px] text-white/45">
            所持 {group.balance.toLocaleString()}pt
          </p>
        </div>
        <div className="flex items-center justify-between rounded-[28px] border-2 border-[#c038ff] bg-black/75 p-2 shadow-[0_0_16px_2px_rgba(192,56,255,0.62)]">
          <NeonButton
            variant="quiet"
            size="icon"
            aria-label="入札額を下げる"
            disabled={amount <= minimum}
            onClick={() => setAmount((value) => Math.max(minimum, value - step))}
          >
            −
          </NeonButton>
          <p className="text-xl font-black">
            {amount.toLocaleString()}
            <span className="ml-1 text-xs text-white/45">pt</span>
          </p>
          <NeonButton
            variant="quiet"
            size="icon"
            aria-label="入札額を上げる"
            onClick={() => setAmount((value) => value + step)}
          >
            ＋
          </NeonButton>
        </div>
        <NeonButton size="lg" className="mt-4 w-full" onClick={submitBid}>
          この金額で入札する
        </NeonButton>
      </div>

      {message ? (
        <div
          role="status"
          className="fixed bottom-[92px] left-1/2 z-50 w-[calc(100%-48px)] max-w-[354px] -translate-x-1/2 rounded-2xl border border-[#c038ff] bg-[#14031c]/95 px-4 py-3 text-center text-sm font-bold shadow-[0_0_24px_rgba(192,56,255,0.55)]"
        >
          {message}
        </div>
      ) : null}
      <BottomNavigation items={getGroupNavigation(group.id)} active="auctions" />
    </MobileShell>
  );
}

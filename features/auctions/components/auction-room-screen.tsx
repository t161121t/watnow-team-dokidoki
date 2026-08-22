"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { MobileShell } from "@/components/layout/mobile-shell";
import { ScreenHeader } from "@/components/layout/screen-header";
import { NeonButton } from "@/components/ui/neon-button";
import { NeonCard } from "@/components/ui/neon-card";
import { NeonInput } from "@/components/ui/neon-field";
import { StarRating } from "@/components/ui/star-rating";
import { getAnonymousBidFeed, getAuction, placeBid } from "@/features/auctions/actions";
import type { PlaceBidErrorStatus } from "@/features/auctions/actions";
import { useAuctionRealtime } from "@/features/auctions/components/use-auction-realtime";
import { formatRemainingLabel } from "@/features/auctions/format";
import type { AuctionStatus } from "@/features/auctions/types";
import { getGroupNavigation } from "@/lib/navigation";

const PLACE_BID_ERROR_MESSAGES: Record<PlaceBidErrorStatus, string> = {
  not_authenticated: "ログインが必要です",
  invalid_input: "入力内容が正しくありません",
  insufficient_balance: "残高が不足しています",
  seller_cannot_bid: "自分の出品には入札できません",
  dealer_cannot_bid: "担当ディーラーは入札できません",
  amount_too_low: "現在価格を超える金額を入力してください",
  not_open: "現在は入札を受け付けていません",
  outside_bidding_window: "入札受付時間外です",
  not_a_member: "このグループのメンバーではありません",
  unknown_error: "入札に失敗しました",
};

export type RoomAuction = {
  id: string;
  groupId: string;
  summary: string;
  category: string;
  rarity: number;
  status: AuctionStatus;
  currentPrice: number;
  endsAt: Date | null;
};

export type AnonymousBid = { amount: number; rank: number };

const BID_STEP = 1;
// PostgreSQL int4の上限（features/auctions/actions.tsのplaceBidSchemaと
// 同じ理由。手打ち入力だとここを超える値を入力しやすい。2026-08-23レビュー
// 指摘）。
const INT4_MAX = 2147483647;

export function AuctionRoomScreen({
  auction,
  initialBidFeed,
  balanceSection,
}: {
  auction: RoomAuction;
  initialBidFeed: AnonymousBid[];
  balanceSection: ReactNode;
}) {
  const router = useRouter();
  const [currentPrice, setCurrentPrice] = useState(auction.currentPrice);
  const [status, setStatus] = useState<AuctionStatus>(auction.status);
  const [endsAt, setEndsAt] = useState<Date | null>(auction.endsAt);
  const [bidFeed, setBidFeed] = useState<AnonymousBid[]>(initialBidFeed);
  // 手打ち入力にも対応するため文字列で持つ（number stateだと入力途中の
  // 空文字・削除中の状態を表現できない）。±ボタン・現在価格追随時は
  // 常に整数文字列を書き込む。
  const [amount, setAmount] = useState(String(auction.currentPrice + BID_STEP));
  const numericAmount = Number(amount);
  const isAmountValid =
    Number.isInteger(numericAmount) && numericAmount > currentPrice && numericAmount <= INT4_MAX;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [remainingLabel, setRemainingLabel] = useState(() =>
    formatRemainingLabel(auction.endsAt, auction.status),
  );

  // 現在価格が動いたら入札額の初期値もそれに追随させる（自分の入札直後・
  // 他人の入札のrealtime反映の両方をカバー）。レンダー中に直接調整する
  // Reactの推奨パターン（useEffectでのsetStateはcascading renderを招くため
  // react-hooks/set-state-in-effectで禁止されている）。
  const [priceForAmountSync, setPriceForAmountSync] = useState(currentPrice);
  if (currentPrice !== priceForAmountSync) {
    setPriceForAmountSync(currentPrice);
    setAmount(String(currentPrice + BID_STEP));
  }

  // 残り時間はendsAt/statusが変わらなくても1秒ごとに表示だけ更新する。
  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingLabel(formatRemainingLabel(endsAt, status));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt, status]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const refreshBidFeed = async () => {
    try {
      const rows = await getAnonymousBidFeed({ auctionId: auction.id });
      setBidFeed(rows.map((row) => ({ amount: row.amount, rank: Number(row.rank) })));
    } catch {
      // 入札フィードの再取得失敗は致命的ではないため無視する（価格自体はrealtimeで更新済み）
    }
  };

  const isSubscribedOnceRef = useRef(false);
  useAuctionRealtime(
    auction.groupId,
    auction.id,
    (row) => {
      setCurrentPrice(row.current_price);
      setStatus(row.status as AuctionStatus);
      setEndsAt(row.ends_at ? new Date(row.ends_at) : null);
      void refreshBidFeed();
      router.refresh(); // 残高（balanceSection）を最新化する
    },
    (subscribeStatus) => {
      // 初回接続の取りこぼし対策（use-auction-realtime.tsの利用契約）。
      // 購読成立前に入った更新を拾うため、SUBSCRIBED時に1度だけ最新値を取り直す。
      if (subscribeStatus === "SUBSCRIBED" && !isSubscribedOnceRef.current) {
        isSubscribedOnceRef.current = true;
        void (async () => {
          const fresh = await getAuction({ auctionId: auction.id });
          if (fresh) {
            setCurrentPrice(fresh.current_price);
            setStatus(fresh.status);
            setEndsAt(fresh.ends_at ? new Date(fresh.ends_at) : null);
          }
          void refreshBidFeed();
        })();
      }
    },
  );

  const canBid = status === "open";

  // ±ボタンで整数値へ正規化する。手打ちで小数（例: 101.5）や下限未満を
  // 入れた状態でボタンを押しても、常に有効な整数へ補正されるようにする
  // （2026-08-23レビュー指摘: +側がMath.floorしていないと小数のまま
  // 増え続けてしまい、-側（Math.maxで下限に落ちる）と挙動が非対称だった）。
  const stepAmount = (delta: number) => {
    setAmount((value) => {
      const parsed = Number(value);
      const base = Number.isFinite(parsed) ? Math.floor(parsed) : currentPrice;
      return String(Math.min(INT4_MAX, Math.max(currentPrice + BID_STEP, base + delta)));
    });
  };

  const submitBid = async () => {
    setMessage("");
    if (!isAmountValid) {
      setMessage("現在価格を超える金額を入力してください");
      return;
    }
    setIsSubmitting(true);
    try {
      // throw/error.messageの文字列比較には依存しない（本番ビルドではServer
      // Actionのエラーメッセージがサニタイズされ判定できなくなるため。
      // 2026-08-23、ユーザー報告で発覚）。placeBidは例外を投げず、戻り値の
      // statusで成功/失敗理由を表現する（セッション切れ・入力不正も含む）。
      const result = await placeBid({ auctionId: auction.id, amount: numericAmount });
      if (result.status === "ok") {
        setMessage(`${numericAmount.toLocaleString()}ptで入札しました`);
        router.refresh();
      } else {
        setMessage(PLACE_BID_ERROR_MESSAGES[result.status]);
      }
    } catch {
      // Server Actionの通信失敗等、上記statusが返らない予期しない例外の保険。
      setMessage("通信エラーが発生しました。もう一度お試しください");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileShell withNavigation>
      <ScreenHeader
        title="オークション会場"
        backHref={`/groups/${auction.groupId}/auctions`}
      />

      <div className="mb-4 text-right">
        <span className="text-xs font-bold text-[#e591ff]">{remainingLabel}</span>
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
            <StarRating value={auction.rarity} label="レア度" className="mt-1.5" />
          </div>
        </div>
      </NeonCard>

      <NeonCard className="mt-4 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-white/45">現在価格</p>
            <p className="mt-1 text-[34px] leading-none font-black">
              {currentPrice.toLocaleString()}
              <span className="ml-1 text-sm text-white/50">pt</span>
            </p>
          </div>
          <p className="text-xs text-white/45">入札 {bidFeed.length}件</p>
        </div>
      </NeonCard>

      {bidFeed.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {bidFeed.slice(0, 5).map((bid, index) => (
            <div
              key={`${bid.rank}-${index}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs"
            >
              <span className="text-white/45">{bid.rank}位</span>
              <span className="font-bold">{bid.amount.toLocaleString()}pt</span>
            </div>
          ))}
        </div>
      ) : null}

      {canBid ? (
        <div className="mt-7">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-bold">入札ポイント</p>
            <div className="text-[11px] text-white/45">所持 {balanceSection}</div>
          </div>
          <div className="flex items-center justify-between rounded-[28px] border-2 border-[#c038ff] bg-black/75 p-2 shadow-[0_0_16px_2px_rgba(192,56,255,0.62)]">
            <NeonButton
              variant="quiet"
              size="icon"
              aria-label="入札額を下げる"
              disabled={!Number.isFinite(numericAmount) || numericAmount <= currentPrice + BID_STEP}
              onClick={() => stepAmount(-BID_STEP)}
            >
              −
            </NeonButton>
            <div className="flex items-center gap-1">
              <NeonInput
                type="number"
                inputMode="numeric"
                aria-label="入札額"
                value={amount}
                min={currentPrice + 1}
                max={INT4_MAX}
                step={1}
                className="h-auto min-h-0 w-24 border-0 bg-transparent p-0 text-center text-xl font-black shadow-none [appearance:textfield] focus-visible:ring-0 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                onChange={(event) => setAmount(event.target.value)}
              />
              <span className="text-xs text-white/45">pt</span>
            </div>
            <NeonButton
              variant="quiet"
              size="icon"
              aria-label="入札額を上げる"
              disabled={numericAmount >= INT4_MAX}
              onClick={() => stepAmount(BID_STEP)}
            >
              ＋
            </NeonButton>
          </div>
          <NeonButton
            size="lg"
            className="mt-4 w-full"
            disabled={isSubmitting || !isAmountValid}
            aria-busy={isSubmitting}
            onClick={submitBid}
          >
            {isSubmitting ? "送信中…" : "この金額で入札する"}
          </NeonButton>
        </div>
      ) : (
        <p className="mt-7 text-center text-sm text-white/55">
          {status === "pending_dealer_approval"
            ? "ディーラーの承認待ちです"
            : "このオークションは入札を受け付けていません"}
        </p>
      )}

      {message ? (
        <div
          role="status"
          className="fixed bottom-[92px] left-1/2 z-50 w-[calc(100%-48px)] max-w-[354px] -translate-x-1/2 rounded-2xl border border-[#c038ff] bg-[#14031c]/95 px-4 py-3 text-center text-sm font-bold shadow-[0_0_24px_rgba(192,56,255,0.55)]"
        >
          {message}
        </div>
      ) : null}
      <BottomNavigation items={getGroupNavigation(auction.groupId)} active="auctions" />
    </MobileShell>
  );
}

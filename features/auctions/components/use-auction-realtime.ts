"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * auctionsテーブルの列（snake_case）のうち、価格更新の購読で使う分だけ。
 * 書き込みは引き続きPrisma（place_bid RPC）経由、購読だけSupabase Client
 * （Realtime）を使う分担（docs/アーキテクチャ.md冒頭の表）。
 */
export type AuctionRealtimeUpdate = {
  status: string;
  current_price: number;
  ends_at: string | null;
};

/**
 * `.subscribe()`のコールバックがそのまま返す状態（@supabase/realtime-js の
 * REALTIME_SUBSCRIBE_STATES）。SUBSCRIBED以外（TIMED_OUT/CLOSED/
 * CHANNEL_ERROR）になった場合、以降の更新は届かない（PR #68レビュー指摘:
 * 認証切れ・RLS/Realtime設定ミス・ネットワーク失敗などで購読が成立して
 * いなくても、状態を見ていないとUI側は静かに古い価格を表示し続けてしまう）。
 */
export type AuctionRealtimeStatus = "SUBSCRIBED" | "TIMED_OUT" | "CLOSED" | "CHANNEL_ERROR";

/**
 * オークションの現在価格・状態の変更をSupabase Realtime（postgres_changes）で
 * 購読する。RLS（auctions_select_member。prisma/sql/auctions/001_rls.sql）が
 * 配信にもそのまま適用されるため、グループ外のユーザーには何も届かない。
 * テーブルをsupabase_realtime publicationに追加する側の対応は
 * prisma/sql/auctions/006_realtime.sql。
 *
 * groupIdをchannel名・filterの両方に含めている（docs/DB.md §9「他グループの
 * 変更が購読で漏れないよう、チャネル名とfilterにgroup_idを含める」。PR #68
 * レビュー指摘）。filterはカンマ区切りでAND条件になる
 * （@supabase/realtime-jsのRealtimeChannel.d.ts参照）ため
 * `id=eq.${auctionId},group_id=eq.${groupId}` で両方を同時に絞り込める。
 * RLSはもう1段の防御であり、これに依存しきらない設計にしている。
 *
 * 【利用契約】初期データ取得（RSCでのfetch等）とこのフックのsubscribe開始の
 * 間にUPDATEが入ると、そのイベントは届かない（購読が成立する前の変更は
 * 過去のイベントとして再送されないため）。呼び出し側は`onStatusChange`で
 * `SUBSCRIBED`を受け取ったタイミングで最新値を再取得し、購読開始前の
 * 取りこぼしを解消すること（PR #68レビュー指摘）。
 *
 * 2026-08-21時点でどの画面からも呼ばれていない（オークションUI ⑨/⑩は
 * まだモックデータのまま実データに未接続のため。features/auctions/
 * components/auction-room-screen.tsx参照）。issue #42の「実装パターンの
 * 確立」に対応する部分としてここに置く。UI接続時にこのフックを使う想定。
 *
 * onUpdate/onStatusChangeはrefに保持し、識別子が変わってもgroupId/auctionId
 * 不変なら再購読しない（呼び出し側にuseCallbackでのメモ化を要求しないため）。
 */
export function useAuctionRealtime(
  groupId: string,
  auctionId: string,
  onUpdate: (row: AuctionRealtimeUpdate) => void,
  onStatusChange?: (status: AuctionRealtimeStatus) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  const onStatusChangeRef = useRef(onStatusChange);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onStatusChangeRef.current = onStatusChange;
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`auction:${groupId}:${auctionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId},group_id=eq.${groupId}`,
        },
        (payload) => {
          onUpdateRef.current(payload.new as AuctionRealtimeUpdate);
        },
      )
      .subscribe((status) => {
        onStatusChangeRef.current?.(status as AuctionRealtimeStatus);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [groupId, auctionId]);
}

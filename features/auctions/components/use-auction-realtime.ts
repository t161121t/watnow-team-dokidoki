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
 * オークションの現在価格・状態の変更をSupabase Realtime（postgres_changes）で
 * 購読する。RLS（auctions_select_member。prisma/sql/auctions/001_rls.sql）が
 * 配信にもそのまま適用されるため、グループ外のユーザーには何も届かない。
 * テーブルをsupabase_realtime publicationに追加する側の対応は
 * prisma/sql/auctions/006_realtime.sql。
 *
 * 2026-08-21時点でどの画面からも呼ばれていない（オークションUI ⑨/⑩は
 * まだモックデータのまま実データに未接続のため。features/auctions/
 * components/auction-room-screen.tsx参照）。issue #42の「実装パターンの
 * 確立」に対応する部分としてここに置く。UI接続時にこのフックを使う想定。
 *
 * onUpdateはrefに保持し、識別子が変わってもauctionId不変なら再購読しない
 * （呼び出し側にuseCallbackでのメモ化を要求しないため）。
 */
export function useAuctionRealtime(
  auctionId: string,
  onUpdate: (row: AuctionRealtimeUpdate) => void,
) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`auction:${auctionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auctions",
          filter: `id=eq.${auctionId}`,
        },
        (payload) => {
          onUpdateRef.current(payload.new as AuctionRealtimeUpdate);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);
}

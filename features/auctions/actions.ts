"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import { approveDealerAssignment as approveDealerAssignmentInDb } from "@/features/auctions/server/approve-dealer-assignment";
import { declineDealer as declineDealerInDb } from "@/features/auctions/server/decline-dealer";
import { placeBid as placeBidInDb } from "@/features/auctions/server/place-bid";
import { getAuctionList as getAuctionListInDb } from "@/features/auctions/server/get-auction-list";
import { getBidderIdentifiedBids as getBidderIdentifiedBidsInDb } from "@/features/auctions/server/get-bidder-identified-bids";
import { getAnonymousBidFeed as getAnonymousBidFeedInDb } from "@/features/auctions/server/get-anonymous-bid-feed";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("ログインが必要です");
  }
}

const auctionIdSchema = z.object({ auctionId: z.string().uuid() });

/**
 * ディーラー承認。承認でopenになり、入札受付が始まる（starts_at/ends_atも
 * このRPCの中で確定する）。approve_dealer_assignment RPC経由。
 */
export async function approveDealerAssignment(input: { auctionId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = auctionIdSchema.parse(input);
  return approveDealerAssignmentInDb(userId, parsed.auctionId);
}

/**
 * ディーラー辞退。辞退料（P12=5%、完全没収）が発生し、別のディーラーへ
 * 再割当される。decline_dealer RPC経由。
 */
export async function declineDealer(input: { auctionId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = auctionIdSchema.parse(input);
  return declineDealerInDb(userId, parsed.auctionId);
}

const placeBidSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.number().int().positive(),
});

/**
 * 入札。現在価格超え・残高十分・自出品/ディーラー本人でないこと等は
 * place_bid RPC側が検証する（RLS + Function内チェックの二重防御）。
 */
export async function placeBid(input: { auctionId: string; amount: number }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = placeBidSchema.parse(input);
  return placeBidInDb(userId, parsed.auctionId, parsed.amount);
}

const groupIdSchema = z.object({ groupId: z.string().uuid() });

/** ⑨オークション一覧。auction_public_view経由。 */
export async function getAuctionList(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = groupIdSchema.parse(input);
  return getAuctionListInDb(userId, parsed.groupId);
}

/**
 * ⑯関連秘密詳細（出品者/ディーラー向け、入札者を識別可能）。
 * bidder_identified_view経由。
 */
export async function getBidderIdentifiedBids(input: { auctionId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = auctionIdSchema.parse(input);
  return getBidderIdentifiedBidsInDb(userId, parsed.auctionId);
}

/** ⑩オークション会場（他入札者は識別不可）。anonymous_bid_feed_view経由。 */
export async function getAnonymousBidFeed(input: { auctionId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = auctionIdSchema.parse(input);
  return getAnonymousBidFeedInDb(userId, parsed.auctionId);
}

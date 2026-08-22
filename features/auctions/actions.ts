"use server";

import { z } from "zod";
import { getCurrentUserId } from "@/lib/supabase/server";
import { approveDealerAssignment as approveDealerAssignmentInDb } from "@/features/auctions/server/approve-dealer-assignment";
import { declineDealer as declineDealerInDb } from "@/features/auctions/server/decline-dealer";
import { placeBid as placeBidInDb } from "@/features/auctions/server/place-bid";
import { getBidderIdentifiedBids as getBidderIdentifiedBidsInDb } from "@/features/auctions/server/get-bidder-identified-bids";
import { getAnonymousBidFeed as getAnonymousBidFeedInDb } from "@/features/auctions/server/get-anonymous-bid-feed";
import { getMyDealerAuctions as getMyDealerAuctionsInDb } from "@/features/auctions/server/get-my-dealer-auctions";
import { getAuction as getAuctionInDb } from "@/features/auctions/server/get-auction";
import { getAuctionBySecretGroupItem as getAuctionBySecretGroupItemInDb } from "@/features/auctions/server/get-auction-by-secret-group-item";

function requireUserId(userId: string | null): asserts userId is string {
  if (!userId) {
    throw new Error("ログインが必要です");
  }
}

/**
 * PostgreSQL FunctionのRAISE EXCEPTIONはPrismaの生SQLエラーとして技術的な
 * メッセージ（P0001等）で返ってくるため、UI表示用に丸める
 * （features/groups/actions.tsのjoinGroupViaInviteLinkと同じパターン）。
 * 元のRAISE EXCEPTIONメッセージ一覧はprisma/sql/auctions/*.sql参照。
 */
function mapPlaceBidError(message: string): string {
  if (message.includes("insufficient balance")) return "残高が不足しています";
  if (message.includes("seller cannot bid")) return "自分の出品には入札できません";
  if (message.includes("dealer cannot bid")) return "担当ディーラーは入札できません";
  if (message.includes("amount must exceed")) return "現在価格を超える金額を入力してください";
  if (message.includes("auction is not open")) return "現在は入札を受け付けていません";
  if (message.includes("bidding window")) return "入札受付時間外です";
  if (message.includes("not a member")) return "このグループのメンバーではありません";
  return "入札に失敗しました";
}

function mapDealerActionError(message: string): string {
  if (message.includes("not authorized")) return "この操作を行う権限がありません";
  if (message.includes("no other eligible dealer")) return "他に割り当て可能なディーラーがいません";
  if (message.includes("already open") || message.includes("not pending approval")) {
    return "この案件は既に処理済みです";
  }
  return "操作に失敗しました";
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
  try {
    return await approveDealerAssignmentInDb(userId, parsed.auctionId);
  } catch (error) {
    throw new Error(mapDealerActionError(error instanceof Error ? error.message : ""));
  }
}

/**
 * ディーラー辞退。辞退料（P12=5%、完全没収）が発生し、別のディーラーへ
 * 再割当される。decline_dealer RPC経由。
 */
export async function declineDealer(input: { auctionId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = auctionIdSchema.parse(input);
  try {
    return await declineDealerInDb(userId, parsed.auctionId);
  } catch (error) {
    throw new Error(mapDealerActionError(error instanceof Error ? error.message : ""));
  }
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
  try {
    return await placeBidInDb(userId, parsed.auctionId, parsed.amount);
  } catch (error) {
    throw new Error(mapPlaceBidError(error instanceof Error ? error.message : ""));
  }
}

const groupIdSchema = z.object({ groupId: z.string().uuid() });

/** ⑩オークション会場。auction_public_view経由で1件取得。 */
export async function getAuction(input: { auctionId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = auctionIdSchema.parse(input);
  return getAuctionInDb(userId, parsed.auctionId);
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

/** 秘密リスト（⑬）「ディーラー」タブ。auction_public_view経由でdealer_id=自分の案件。 */
export async function getMyDealerAuctions(input: { groupId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = groupIdSchema.parse(input);
  return getMyDealerAuctionsInDb(userId, parsed.groupId);
}

const secretGroupItemIdSchema = z.object({ secretGroupItemId: z.string().uuid() });

/** 関連秘密詳細（⑯）ディーラー視点。secret_group_item_idからauction_public_viewを引く。 */
export async function getAuctionBySecretGroupItem(input: { secretGroupItemId: string }) {
  const userId = await getCurrentUserId();
  requireUserId(userId);

  const parsed = secretGroupItemIdSchema.parse(input);
  return getAuctionBySecretGroupItemInDb(userId, parsed.secretGroupItemId);
}

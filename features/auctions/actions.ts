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
 * メッセージ（P0001等）で返ってくるため、UI表示用の分類コードに丸める。
 * 元のRAISE EXCEPTIONメッセージ一覧はprisma/sql/auctions/*.sql参照。
 *
 * throwではなく戻り値のstatusで表現する（features/groups/actions.tsの
 * joinGroupViaInviteLinkと同じパターン）。throw/error.messageの文字列比較には
 * 依存しない設計にしたのは、本番ビルドではServer Actionのエラーメッセージが
 * サニタイズされ、mapPlaceBidError等で組み立てた日本語メッセージ自体が
 * クライアントに届かなくなるため（2026-08-23、ユーザー報告で発覚。
 * join-via-link-screen.tsxのコメント参照）。日本語文言はクライアント側の
 * 呼び出し元コンポーネントで持つ。
 *
 * placeBid/approveDealerAssignment/declineDealerは、セッション切れ・入力
 * 不正もPromise rejectさせずstatusで返す（PR #102レビュー指摘）。この3つに
 * 新しいチェックを追加する際はrequireUserId()やzod .parse()（throw系）では
 * なく、if文 + safeParse()でstatusを返すこと。
 */
export type PlaceBidErrorStatus =
  | "not_authenticated"
  | "invalid_input"
  | "insufficient_balance"
  | "seller_cannot_bid"
  | "dealer_cannot_bid"
  | "amount_too_low"
  | "not_open"
  | "outside_bidding_window"
  | "not_a_member"
  | "unknown_error";

export type PlaceBidResult = { status: "ok" } | { status: PlaceBidErrorStatus };

function mapPlaceBidErrorStatus(message: string): PlaceBidErrorStatus {
  if (message.includes("insufficient balance")) return "insufficient_balance";
  if (message.includes("seller cannot bid")) return "seller_cannot_bid";
  if (message.includes("dealer cannot bid")) return "dealer_cannot_bid";
  if (message.includes("amount must exceed")) return "amount_too_low";
  if (message.includes("auction is not open")) return "not_open";
  if (message.includes("bidding window")) return "outside_bidding_window";
  if (message.includes("not a member")) return "not_a_member";
  return "unknown_error";
}

export type DealerActionErrorStatus =
  | "not_authenticated"
  | "invalid_input"
  | "not_authorized"
  | "not_active_member"
  | "no_other_eligible_dealer"
  | "already_processed"
  | "unknown_error";

export type DealerActionResult = { status: "ok" } | { status: DealerActionErrorStatus };

function mapDealerActionErrorStatus(message: string): DealerActionErrorStatus {
  if (message.includes("not authorized")) return "not_authorized";
  if (message.includes("not an active member")) return "not_active_member";
  if (message.includes("no other eligible dealer")) return "no_other_eligible_dealer";
  if (message.includes("already open") || message.includes("not pending approval")) {
    return "already_processed";
  }
  return "unknown_error";
}

const auctionIdSchema = z.object({ auctionId: z.string().uuid() });

/**
 * ディーラー承認。承認でopenになり、入札受付が始まる（starts_at/ends_atも
 * このRPCの中で確定する）。approve_dealer_assignment RPC経由。
 */
export async function approveDealerAssignment(input: {
  auctionId: string;
}): Promise<DealerActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { status: "not_authenticated" };

  const parsed = auctionIdSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid_input" };

  try {
    await approveDealerAssignmentInDb(userId, parsed.data.auctionId);
    return { status: "ok" };
  } catch (error) {
    return { status: mapDealerActionErrorStatus(error instanceof Error ? error.message : "") };
  }
}

/**
 * ディーラー辞退。辞退料（P12=5%、完全没収）が発生し、別のディーラーへ
 * 再割当される。decline_dealer RPC経由。
 */
export async function declineDealer(input: { auctionId: string }): Promise<DealerActionResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { status: "not_authenticated" };

  const parsed = auctionIdSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid_input" };

  try {
    await declineDealerInDb(userId, parsed.data.auctionId);
    return { status: "ok" };
  } catch (error) {
    return { status: mapDealerActionErrorStatus(error instanceof Error ? error.message : "") };
  }
}

// PostgreSQL int4の上限（features/auctions/server/place-bid.tsがamountを
// int4にキャストするため。手打ち入力だとここを超える値を入力しやすい。
// 2026-08-23レビュー指摘）。
const INT4_MAX = 2147483647;

const placeBidSchema = z.object({
  auctionId: z.string().uuid(),
  amount: z.number().int().positive().max(INT4_MAX),
});

/**
 * 入札。現在価格超え・残高十分・自出品/ディーラー本人でないこと等は
 * place_bid RPC側が検証する（RLS + Function内チェックの二重防御）。
 */
export async function placeBid(input: {
  auctionId: string;
  amount: number;
}): Promise<PlaceBidResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { status: "not_authenticated" };

  const parsed = placeBidSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid_input" };

  try {
    await placeBidInDb(userId, parsed.data.auctionId, parsed.data.amount);
    return { status: "ok" };
  } catch (error) {
    return { status: mapPlaceBidErrorStatus(error instanceof Error ? error.message : "") };
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

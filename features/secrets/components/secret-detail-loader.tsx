import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import {
  getAuctionBySecretGroupItem,
  getBidderIdentifiedBids,
} from "@/features/auctions/actions";
import { SecretDetailScreen } from "@/features/secrets/components/secret-detail-screen";
import type { SecretDetailData } from "@/features/secrets/components/secret-detail-screen";
import { getMySecretItem } from "@/features/secrets/server/get-my-secret-item";
import type { SecretListTab } from "@/features/secrets/secret-list-tab";
import type { SecretGroupItemStatus } from "@/features/secrets/types";
import { getCurrentUserId } from "@/lib/supabase/server";

const STATUS_LABELS: Record<SecretGroupItemStatus, string> = {
  registered: "登録済み",
  listed: "承認待ち",
  on_auction: "出品中",
  sold: "落札済み",
  returned: "返却済み",
  withdrawn: "取消済み",
};

/**
 * 関連秘密詳細（⑯）。secretsドメインの読み取り（getMySecretItem）は自分で
 * server/を直接呼ぶ（docs/アーキテクチャ.md §1.1a、2026-08-22レビュー指摘）。
 * auctionsドメインのデータ（bids・入札対象auction）はドメイン境界上ここから
 * 直接読めないため、features/auctions/actions.ts経由で取得する
 * （cross-domainのread唯一の許容経路。features/secrets/components/
 * secret-list-screen.tsxのdealerタブと同じ理由）。
 */
export async function SecretDetailLoader({
  groupId,
  secretGroupItemId,
  returnTab,
}: {
  groupId: string;
  secretGroupItemId: string;
  returnTab: SecretListTab;
}) {
  if (
    !z.string().uuid().safeParse(groupId).success ||
    !z.string().uuid().safeParse(secretGroupItemId).success
  ) {
    notFound();
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect(
      `/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/secrets/${secretGroupItemId}`)}`,
    );
  }

  // secretGroupItemId = secret_group_item.id。まず自分の所有物かを確認し
  // （owner視点）、違えばディーラー視点（auction_public_view経由）に
  // フォールバックする。
  const ownerItem = await getMySecretItem(userId, secretGroupItemId);

  let secret: SecretDetailData;

  if (ownerItem) {
    const auction = await getAuctionBySecretGroupItem({ secretGroupItemId });
    const bids = auction ? await getBidderIdentifiedBids({ auctionId: auction.auction_id }) : [];

    secret = {
      groupId,
      secretGroupItemId,
      auctionId: auction?.auction_id ?? null,
      viewRole: "owner",
      summary: ownerItem.secret.summary,
      body: ownerItem.secret.body,
      category: ownerItem.secret.category,
      rarity: ownerItem.secret.rarity,
      statusLabel: STATUS_LABELS[ownerItem.status],
      // list_secret_for_auctionはregistered/returnedの両方を受け付ける
      // （不落札で戻ってきた秘密を再出品できる仕様）。registeredのみだと
      // 再出品の唯一の入口が消えてしまう（2026-08-22レビュー指摘）。
      canListForAuction: ownerItem.status === "registered" || ownerItem.status === "returned",
      canApproveOrDecline: false,
      bids: bids.map((bid) => ({ bidderNickname: bid.bidder_nickname, amount: bid.amount })),
    };
  } else {
    const auction = await getAuctionBySecretGroupItem({ secretGroupItemId });
    if (!auction) {
      notFound();
    }

    const bids = await getBidderIdentifiedBids({ auctionId: auction.auction_id });

    secret = {
      groupId,
      secretGroupItemId,
      auctionId: auction.auction_id,
      viewRole: "dealer",
      summary: auction.summary,
      body: null,
      category: auction.category,
      rarity: auction.rarity,
      statusLabel: auction.status === "pending_dealer_approval" ? "承認待ち" : "出品中",
      canListForAuction: false,
      canApproveOrDecline: auction.status === "pending_dealer_approval",
      bids: bids.map((bid) => ({ bidderNickname: bid.bidder_nickname, amount: bid.amount })),
    };
  }

  return <SecretDetailScreen secret={secret} returnTab={returnTab} />;
}

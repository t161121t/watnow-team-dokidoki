import { notFound } from "next/navigation";

import {
  getAuctionBySecretGroupItem,
  getBidderIdentifiedBids,
} from "@/features/auctions/actions";
import { getMySecretItem } from "@/features/secrets/actions";
import { SecretDetailScreen } from "@/features/secrets/components/secret-detail-screen";
import type { SecretDetailData } from "@/features/secrets/components/secret-detail-screen";
import type { SecretGroupItemStatus } from "@/features/secrets/types";

const STATUS_LABELS: Record<SecretGroupItemStatus, string> = {
  registered: "登録済み",
  listed: "承認待ち",
  on_auction: "出品中",
  sold: "落札済み",
  returned: "返却済み",
  withdrawn: "取消済み",
};

export default async function SecretDetailPage({
  params,
}: PageProps<"/groups/[groupId]/secrets/[secretId]">) {
  const { groupId, secretId } = await params;

  // secretId = secret_group_item.id。まず自分の所有物かを確認し（owner視点）、
  // 違えばディーラー視点（auction_public_view経由）にフォールバックする。
  const ownerItem = await getMySecretItem({ secretGroupItemId: secretId });

  let secret: SecretDetailData;

  if (ownerItem) {
    const auction = await getAuctionBySecretGroupItem({ secretGroupItemId: secretId });
    const bids = auction ? await getBidderIdentifiedBids({ auctionId: auction.auction_id }) : [];

    secret = {
      groupId,
      secretGroupItemId: secretId,
      auctionId: auction?.auction_id ?? null,
      viewRole: "owner",
      summary: ownerItem.secret.summary,
      body: ownerItem.secret.body,
      category: ownerItem.secret.category,
      rarity: ownerItem.secret.rarity,
      statusLabel: STATUS_LABELS[ownerItem.status],
      canListForAuction: ownerItem.status === "registered",
      canApproveOrDecline: false,
      bids: bids.map((bid) => ({ bidderNickname: bid.bidder_nickname, amount: bid.amount })),
    };
  } else {
    const auction = await getAuctionBySecretGroupItem({ secretGroupItemId: secretId });
    if (!auction) {
      notFound();
    }

    const bids = await getBidderIdentifiedBids({ auctionId: auction.auction_id });

    secret = {
      groupId,
      secretGroupItemId: secretId,
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

  return <SecretDetailScreen secret={secret} />;
}

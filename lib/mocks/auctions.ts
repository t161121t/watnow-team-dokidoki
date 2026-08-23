import type { Auction } from "@/lib/types/auction";

export const mockAuctions: Auction[] = [
  {
    id: "auction-1",
    groupId: "night-owls",
    secretId: "secret-1",
    title: "サークル合宿でひとりだけ寝なかった本当の理由",
    category: "黒歴史",
    rarity: 4,
    currentPrice: 420,
    minimumBid: 440,
    bidCount: 7,
    remainingLabel: "残り 18分",
    isLeading: false,
    bids: [
      { id: "bid-1", bidderName: "みお", amount: 420, placedAtLabel: "1分前" },
      { id: "bid-2", bidderName: "れん", amount: 380, placedAtLabel: "4分前" },
      { id: "bid-3", bidderName: "はる", amount: 340, placedAtLabel: "8分前" },
    ],
  },
  {
    id: "auction-2",
    groupId: "night-owls",
    secretId: "dealer-1",
    title: "高校時代、毎朝ひそかに続けていたこと",
    category: "特技",
    rarity: 3,
    currentPrice: 260,
    minimumBid: 280,
    bidCount: 4,
    remainingLabel: "残り 42分",
    isLeading: true,
    bids: [
      { id: "bid-4", bidderName: "あなた", amount: 260, placedAtLabel: "3分前" },
      { id: "bid-5", bidderName: "みお", amount: 220, placedAtLabel: "9分前" },
    ],
  },
];

export function getAuctionsForGroup(groupId: string): Auction[] {
  const auctions = mockAuctions.filter((auction) => auction.groupId === groupId);
  return auctions.length > 0
    ? auctions
    : mockAuctions.map((auction) => ({ ...auction, groupId }));
}

export function getAuction(auctionId: string): Auction {
  return mockAuctions.find((auction) => auction.id === auctionId) ?? mockAuctions[0];
}

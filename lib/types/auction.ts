export type Bid = {
  id: string;
  bidderName: string;
  amount: number;
  placedAtLabel: string;
};

export type Auction = {
  id: string;
  groupId: string;
  secretId: string;
  title: string;
  category: string;
  rarity: 1 | 2 | 3 | 4 | 5;
  currentPrice: number;
  minimumBid: number;
  bidCount: number;
  remainingLabel: string;
  isLeading: boolean;
  bids: Bid[];
};

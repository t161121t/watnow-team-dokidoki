-- docs/DB.md §4.10, §4.11, §7.2

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auctions_select_member ON auctions;
CREATE POLICY auctions_select_member ON auctions
  FOR SELECT
  TO authenticated
  USING (is_group_member(group_id));

-- insert/updateは各RPC（list_secret_for_auction/approve_dealer_assignment/
-- decline_dealer/place_bid/claim_auction_for_finalize/finalize_auction）経由のみ

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bids_select_own ON bids;
CREATE POLICY bids_select_own ON bids
  FOR SELECT
  TO authenticated
  USING (bidder_id = auth.uid());

-- seller/dealerによる入札者識別付きの閲覧は bidder_identified_view 経由
-- （bids自体のRLSは本人のみ。direct insertはplace_bid RPCのみ）

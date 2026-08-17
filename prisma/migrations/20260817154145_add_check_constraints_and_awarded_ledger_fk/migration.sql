-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_awarded_ledger_id_fkey" FOREIGN KEY ("awarded_ledger_id") REFERENCES "wallet_ledger"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint (docs/DB.md §4, 2026-08-18 PRレビュー反映: schema.prisma単体では表現できないため手動追記)
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_amount_nonzero" CHECK (amount <> 0);

ALTER TABLE "secrets" ADD CONSTRAINT "secrets_rarity_range" CHECK (rarity BETWEEN 1 AND 5);

ALTER TABLE "secret_group_items" ADD CONSTRAINT "secret_group_items_asking_price_nonnegative" CHECK (asking_price >= 0);
ALTER TABLE "secret_group_items" ADD CONSTRAINT "secret_group_items_current_value_nonnegative" CHECK (current_value >= 0);

ALTER TABLE "bids" ADD CONSTRAINT "bids_amount_positive" CHECK (amount > 0);

ALTER TABLE "challenges" ADD CONSTRAINT "challenges_reward_points_nonnegative" CHECK (reward_points >= 0);

ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_dealer_distinct" CHECK (seller_id <> dealer_id);
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_starting_price_nonnegative" CHECK (starting_price >= 0);
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_current_price_gte_starting" CHECK (current_price >= starting_price);
-- starts_at/ends_atは両方nullか両方not nullのいずれか（片方だけの中途半端な状態を禁止）。
-- 両方not nullならstarts_at < ends_atも要求する
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_starts_ends_consistency" CHECK (
  (starts_at IS NULL AND ends_at IS NULL)
  OR (starts_at IS NOT NULL AND ends_at IS NOT NULL AND starts_at < ends_at)
);
-- pending_dealer_approval中はstarts_at/ends_atはnullのはず（approve_dealer_assignmentで初めて設定される）
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_pending_status_no_times" CHECK (
  status <> 'pending_dealer_approval' OR (starts_at IS NULL AND ends_at IS NULL)
);

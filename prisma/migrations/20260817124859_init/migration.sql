-- CreateEnum
CREATE TYPE "member_role" AS ENUM ('member', 'admin');

-- CreateEnum
CREATE TYPE "member_status" AS ENUM ('invited', 'active', 'left', 'kicked');

-- CreateEnum
CREATE TYPE "secret_item_status" AS ENUM ('registered', 'listed', 'on_auction', 'sold', 'returned', 'withdrawn');

-- CreateEnum
CREATE TYPE "auction_status" AS ENUM ('pending_dealer_approval', 'open', 'finalizing', 'sold', 'no_sale', 'canceled');

-- CreateEnum
CREATE TYPE "bid_status" AS ENUM ('valid', 'superseded', 'winning', 'canceled', 'failed');

-- CreateEnum
CREATE TYPE "wallet_tx_kind" AS ENUM ('challenge_reward', 'listing_prepay', 'listing_reclaim', 'winning_bid_debit', 'seller_share_credit', 'dealer_share_credit', 'dealer_decline_fee', 'admin_adjustment');

-- CreateEnum
CREATE TYPE "challenge_status" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "attempt_status" AS ENUM ('pending', 'approved', 'rejected', 'awarded', 'canceled');

-- CreateEnum
CREATE TYPE "approval_decision" AS ENUM ('approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar_path" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "icon_path" TEXT,
    "created_by" UUID NOT NULL,
    "auction_open_seconds" INTEGER NOT NULL DEFAULT 86400,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "member_role" NOT NULL DEFAULT 'member',
    "status" "member_status" NOT NULL DEFAULT 'invited',
    "invited_by" UUID NOT NULL,
    "invited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joined_at" TIMESTAMPTZ(6),
    "left_at" TIMESTAMPTZ(6),

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expired_at" TIMESTAMPTZ(6),

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "wallet_ledger" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "kind" "wallet_tx_kind" NOT NULL,
    "ref_table" TEXT,
    "ref_id" UUID,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rarity" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secret_group_items" (
    "id" UUID NOT NULL,
    "secret_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "status" "secret_item_status" NOT NULL,
    "asking_price" INTEGER NOT NULL,
    "current_value" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "secret_group_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auctions" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "secret_group_item_id" UUID NOT NULL,
    "seller_id" UUID NOT NULL,
    "dealer_id" UUID NOT NULL,
    "status" "auction_status" NOT NULL DEFAULT 'pending_dealer_approval',
    "starting_price" INTEGER NOT NULL,
    "current_price" INTEGER NOT NULL,
    "dealer_approved_at" TIMESTAMPTZ(6),
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "winner_id" UUID,
    "winning_bid_id" UUID,
    "final_price" INTEGER,
    "listing_prepay_amount" INTEGER NOT NULL,
    "seller_share_amount" INTEGER,
    "dealer_share_amount" INTEGER,
    "no_sale_depreciation_amount" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "finalized_at" TIMESTAMPTZ(6),

    CONSTRAINT "auctions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bids" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "auction_id" UUID NOT NULL,
    "bidder_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "bid_status" NOT NULL DEFAULT 'valid',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenges" (
    "id" UUID NOT NULL,
    "group_id" UUID,
    "created_by" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward_points" INTEGER NOT NULL,
    "requires_evidence_photo" BOOLEAN NOT NULL DEFAULT false,
    "cooldown_seconds" INTEGER,
    "status" "challenge_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "challenge_attempts" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "challenge_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" "attempt_status" NOT NULL DEFAULT 'pending',
    "evidence_path" TEXT,
    "reward_points" INTEGER,
    "awarded_ledger_id" UUID,
    "reviewed_by" UUID,
    "reviewed_decision" "approval_decision",
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "awarded_at" TIMESTAMPTZ(6),

    CONSTRAINT "challenge_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_members_user_id_status_idx" ON "group_members"("user_id", "status");

-- CreateIndex
CREATE INDEX "wallet_ledger_group_id_user_id_created_at_idx" ON "wallet_ledger"("group_id", "user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "wallet_ledger_kind_ref_table_ref_id_idx" ON "wallet_ledger"("kind", "ref_table", "ref_id");

-- CreateIndex
CREATE INDEX "secrets_owner_id_created_at_idx" ON "secrets"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "secret_group_items_group_id_status_updated_at_idx" ON "secret_group_items"("group_id", "status", "updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "secret_group_items_secret_id_group_id_key" ON "secret_group_items"("secret_id", "group_id");

-- CreateIndex
CREATE INDEX "auctions_group_id_status_starts_at_ends_at_idx" ON "auctions"("group_id", "status", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "auctions_secret_group_item_id_idx" ON "auctions"("secret_group_item_id");

-- CreateIndex
CREATE INDEX "auctions_winner_id_group_id_finalized_at_idx" ON "auctions"("winner_id", "group_id", "finalized_at" DESC);

-- CreateIndex
CREATE INDEX "bids_auction_id_amount_created_at_idx" ON "bids"("auction_id", "amount" DESC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "bids_group_id_bidder_id_created_at_idx" ON "bids"("group_id", "bidder_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "challenge_attempts_group_id_user_id_challenge_id_created_at_idx" ON "challenge_attempts"("group_id", "user_id", "challenge_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_group_id_user_id_fkey" FOREIGN KEY ("group_id", "user_id") REFERENCES "wallets"("group_id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secrets" ADD CONSTRAINT "secrets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_group_items" ADD CONSTRAINT "secret_group_items_secret_id_fkey" FOREIGN KEY ("secret_id") REFERENCES "secrets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "secret_group_items" ADD CONSTRAINT "secret_group_items_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_secret_group_item_id_fkey" FOREIGN KEY ("secret_group_item_id") REFERENCES "secret_group_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_dealer_id_fkey" FOREIGN KEY ("dealer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auctions" ADD CONSTRAINT "auctions_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_auction_id_fkey" FOREIGN KEY ("auction_id") REFERENCES "auctions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bids" ADD CONSTRAINT "bids_bidder_id_fkey" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenges" ADD CONSTRAINT "challenges_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "challenge_attempts" ADD CONSTRAINT "challenge_attempts_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Manual additions (Prismaのスキーマ言語では表現できないもの。docs/DB.md参照)

-- users.id は Supabase Auth (auth.users) のユーザーと1:1にする運用（IDを一致させる）。
-- FK制約は張らない: Prisma Migrateのshadow DBには auth スキーマが存在せず、
-- 毎回のマイグレーションが失敗するため。auth.users 側の削除に連動させたい場合は
-- Supabase側でtrigger（auth.usersのDELETEで対応行を消す）を別途用意すること。

-- groups.auction_open_seconds > 0（docs/DB.md §4.2。レビュー指摘: 0/負数だと承認と同時に終了済みauctionができる）
ALTER TABLE "groups" ADD CONSTRAINT "groups_auction_open_seconds_positive" CHECK ("auction_open_seconds" > 0);

-- 1つの secret_group_item につき同時に active な auction は1つまで（docs/DB.md §8）
CREATE UNIQUE INDEX "secret_group_items_one_active_auction"
  ON "auctions" ("secret_group_item_id")
  WHERE "status" IN ('pending_dealer_approval', 'open', 'finalizing');

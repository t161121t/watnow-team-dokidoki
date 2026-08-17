-- docs/DB.md §7.1
-- 他ドメインのRLSポリシー・PostgreSQL Functionから使う共通ヘルパー。
-- common/ は他ドメインより必ず先に適用される（scripts/apply-sql.ts参照）。

CREATE OR REPLACE FUNCTION is_group_member(target_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = target_group_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(target_group_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = target_group_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
  );
$$;

-- 2026-08-18 PRレビュー反映: leave_group/kick_group_memberが、進行中オークションに
-- 関与中（出品者・ディーラー・有効な入札者）のユーザーを脱退させてしまうと、
-- 直後にwalletがexpiredになりfinalize/decline処理が破綻する。その予防チェック。
CREATE OR REPLACE FUNCTION has_active_auction_involvement(target_group_id uuid, target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auctions
    WHERE group_id = target_group_id
      AND status IN ('pending_dealer_approval', 'open', 'finalizing')
      AND (seller_id = target_user_id OR dealer_id = target_user_id)
  ) OR EXISTS (
    SELECT 1 FROM bids b
    JOIN auctions a ON a.id = b.auction_id
    WHERE a.group_id = target_group_id
      AND a.status IN ('pending_dealer_approval', 'open', 'finalizing')
      AND b.bidder_id = target_user_id
      AND b.status = 'valid'
  );
$$;

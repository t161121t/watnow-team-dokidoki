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

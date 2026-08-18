-- docs/DB.md §4.1, §4.2, §4.3, §7.2

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_self_or_group_member ON users;
CREATE POLICY users_select_self_or_group_member ON users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM group_members gm_self
      JOIN group_members gm_other
        ON gm_other.group_id = gm_self.group_id
      WHERE gm_self.user_id = auth.uid()
        AND gm_self.status = 'active'
        AND gm_other.user_id = users.id
        AND gm_other.status = 'active'
    )
  );

DROP POLICY IF EXISTS users_update_self ON users;
CREATE POLICY users_update_self ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- insert は Supabase Auth のサインアップ後、アプリのオンボーディングRPC
-- （create_profile。prisma/sql/auth/001_create_profile.sql）で行う。
-- ここでは明示的なINSERTポリシーは定義しない（RPC(SECURITY DEFINER)経由のみ許可）。

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS groups_select_member ON groups;
CREATE POLICY groups_select_member ON groups
  FOR SELECT
  TO authenticated
  USING (is_group_member(id));

DROP POLICY IF EXISTS groups_update_admin ON groups;
CREATE POLICY groups_update_admin ON groups
  FOR UPDATE
  TO authenticated
  USING (is_group_admin(id))
  WITH CHECK (is_group_admin(id));

-- insert は create_group RPC のみ（直接INSERTポリシーは定義しない）

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_members_select_member_roster ON group_members;
CREATE POLICY group_members_select_member_roster ON group_members
  FOR SELECT
  TO authenticated
  USING (
    -- 同じグループの active member はロースター全体を見られる
    is_group_member(group_id)
    -- invited 本人は自分の招待行だけ見える
    OR (user_id = auth.uid())
  );

-- insert/update/deleteポリシーは定義しない（invite_member/accept_invite/decline_invite/
-- update_group_member_role/kick_group_member/leave_group のRPC経由のみ）

-- docs/DB.md §6.1 leave_group / update_group_member_role / kick_group_member
-- 「active adminが最低1人残る」はここで保証する（check constraintでは表現できないため）
-- 2026-08-18レビュー反映: 進行中オークションに関与中（出品者/ディーラー/有効な入札者）の
-- ユーザーは脱退・kickできない（has_active_auction_involvement、common/001参照）。
-- 脱退直後にwalletがexpiredになり、finalize/decline処理が破綻するのを防ぐ
--
-- 2026-08-19レビュー反映: 「他にadminがcount(*)人いる」を確認してから別行を
-- 更新する作りだと、admin A/Bが同時に互いを降格/脱退させた場合、両トランザクション
-- がそれぞれ「他に1人adminがいる」と見て通過し、最終的にactive adminが0人になる
-- TOCTOU競合があった。各関数の冒頭でgroups行をFOR UPDATEでロックし、同一グループの
-- membership変更（leave/role変更/kick）を直列化することで防ぐ。

CREATE OR REPLACE FUNCTION leave_group(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role member_role;
  v_other_admins int;
BEGIN
  -- 同一グループのmembership変更を直列化する（上記コメント参照）。
  PERFORM 1 FROM groups WHERE id = p_group_id FOR UPDATE;

  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'leave_group: not an active member of this group';
  END IF;

  IF has_active_auction_involvement(p_group_id, auth.uid()) THEN
    RAISE EXCEPTION 'leave_group: cannot leave while involved in an active auction (seller, dealer, or bidder)';
  END IF;

  IF v_role = 'admin' THEN
    SELECT count(*) INTO v_other_admins
    FROM group_members
    WHERE group_id = p_group_id AND status = 'active' AND role = 'admin' AND user_id <> auth.uid();

    IF v_other_admins = 0 THEN
      RAISE EXCEPTION 'leave_group: cannot leave as the last admin';
    END IF;
  END IF;

  UPDATE group_members
  SET status = 'left', left_at = now()
  WHERE group_id = p_group_id AND user_id = auth.uid();

  UPDATE wallets
  SET expired_at = now(), updated_at = now()
  WHERE group_id = p_group_id AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION update_group_member_role(p_group_id uuid, p_user_id uuid, p_role member_role)
RETURNS group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result group_members;
  v_other_admins int;
BEGIN
  -- 同一グループのmembership変更を直列化する（このファイル冒頭のコメント参照）。
  PERFORM 1 FROM groups WHERE id = p_group_id FOR UPDATE;

  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'update_group_member_role: not authorized';
  END IF;

  IF p_role = 'member' THEN
    SELECT count(*) INTO v_other_admins
    FROM group_members
    WHERE group_id = p_group_id AND status = 'active' AND role = 'admin' AND user_id <> p_user_id;

    IF v_other_admins = 0 THEN
      RAISE EXCEPTION 'update_group_member_role: cannot demote the last admin';
    END IF;
  END IF;

  UPDATE group_members
  SET role = p_role
  WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'active'
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_group_member_role: target is not an active member';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION kick_group_member(p_group_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_role member_role;
  v_other_admins int;
BEGIN
  -- 同一グループのmembership変更を直列化する（このファイル冒頭のコメント参照）。
  PERFORM 1 FROM groups WHERE id = p_group_id FOR UPDATE;

  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'kick_group_member: not authorized';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'kick_group_member: use leave_group to remove yourself';
  END IF;

  SELECT role INTO v_target_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'kick_group_member: target is not an active member';
  END IF;

  IF has_active_auction_involvement(p_group_id, p_user_id) THEN
    RAISE EXCEPTION 'kick_group_member: target is involved in an active auction (seller, dealer, or bidder)';
  END IF;

  IF v_target_role = 'admin' THEN
    SELECT count(*) INTO v_other_admins
    FROM group_members
    WHERE group_id = p_group_id AND status = 'active' AND role = 'admin' AND user_id <> p_user_id;

    IF v_other_admins = 0 THEN
      RAISE EXCEPTION 'kick_group_member: cannot kick the last admin';
    END IF;
  END IF;

  UPDATE group_members
  SET status = 'kicked', left_at = now()
  WHERE group_id = p_group_id AND user_id = p_user_id;

  UPDATE wallets
  SET expired_at = now(), updated_at = now()
  WHERE group_id = p_group_id AND user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION leave_group(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION leave_group(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION update_group_member_role(uuid, uuid, member_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_group_member_role(uuid, uuid, member_role) TO authenticated;

REVOKE EXECUTE ON FUNCTION kick_group_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION kick_group_member(uuid, uuid) TO authenticated;

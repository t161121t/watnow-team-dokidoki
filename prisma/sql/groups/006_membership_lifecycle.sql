-- docs/DB.md §6.1 leave_group / update_group_member_role / kick_group_member
-- 「active adminが最低1人残る」はここで保証する（check constraintでは表現できないため）

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
  SELECT role INTO v_role
  FROM group_members
  WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'leave_group: not an active member of this group';
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

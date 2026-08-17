-- docs/DB.md §4.3 invite_member の再招待時の挙動

CREATE OR REPLACE FUNCTION invite_member(p_group_id uuid, p_user_id uuid)
RETURNS group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing group_members;
  v_result group_members;
BEGIN
  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'invite_member: not authorized';
  END IF;

  SELECT * INTO v_existing FROM group_members
  WHERE group_id = p_group_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO group_members (group_id, user_id, role, status, invited_by, invited_at)
    VALUES (p_group_id, p_user_id, 'member', 'invited', auth.uid(), now())
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;

  IF v_existing.status = 'invited' THEN
    RETURN v_existing; -- no-op（二重招待エラーにしない）
  ELSIF v_existing.status = 'active' THEN
    RAISE EXCEPTION 'invite_member: user is already a member';
  ELSE
    -- 'left' / 'kicked' からの再招待
    UPDATE group_members
    SET status = 'invited',
        role = 'member',
        invited_by = auth.uid(),
        invited_at = now(),
        joined_at = NULL,
        left_at = NULL
    WHERE group_id = p_group_id AND user_id = p_user_id
    RETURNING * INTO v_result;
    RETURN v_result;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION invite_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION invite_member(uuid, uuid) TO authenticated;

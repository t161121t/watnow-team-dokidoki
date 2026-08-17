-- docs/DB.md §6.1 create_group

CREATE OR REPLACE FUNCTION create_group(p_name text, p_icon_path text DEFAULT NULL)
RETURNS groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group groups;
BEGIN
  INSERT INTO groups (id, name, icon_path, created_by, created_at, updated_at)
  VALUES (gen_random_uuid(), p_name, p_icon_path, auth.uid(), now(), now())
  RETURNING * INTO v_group;

  INSERT INTO group_members (group_id, user_id, role, status, invited_by, invited_at, joined_at)
  VALUES (v_group.id, auth.uid(), 'admin', 'active', auth.uid(), now(), now());

  INSERT INTO wallets (group_id, user_id, balance, created_at, updated_at)
  VALUES (v_group.id, auth.uid(), 0, now(), now());

  RETURN v_group;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_group(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_group(text, text) TO authenticated;

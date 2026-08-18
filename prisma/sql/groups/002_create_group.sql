-- docs/DB.md §6.1 create_group

CREATE OR REPLACE FUNCTION create_group(p_name text, p_icon_path text DEFAULT NULL)
RETURNS groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group groups;
  v_name text := trim(p_name);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_group: not authenticated';
  END IF;

  IF v_name = '' THEN
    RAISE EXCEPTION 'create_group: name must not be empty';
  END IF;

  -- features/groups/actions.tsのZodスキーマ(max(50))と同じ上限。このRPCは
  -- authenticatedにEXECUTE権限があり、Server Actionを経由しない直接呼び出しも
  -- 可能なため、アプリ側バリデーションに頼らずDB側でも同じ制約を課す
  -- （prisma/sql/auth/001_create_profile.sqlと同じ方針）。
  IF char_length(v_name) > 50 THEN
    RAISE EXCEPTION 'create_group: name must be 50 characters or fewer';
  END IF;

  INSERT INTO groups (id, name, icon_path, created_by, created_at, updated_at)
  VALUES (gen_random_uuid(), v_name, p_icon_path, auth.uid(), now(), now())
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

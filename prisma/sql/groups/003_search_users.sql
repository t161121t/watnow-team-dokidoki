-- docs/DB.md §6.1 search_users
-- 2026-08-17レビュー反映: group admin限定・最低2文字・最大20件・既存メンバー除外

CREATE OR REPLACE FUNCTION search_users(p_group_id uuid, p_query text)
RETURNS TABLE (id uuid, nickname text, avatar_path text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'search_users: not authorized';
  END IF;

  IF length(trim(p_query)) < 2 THEN
    RAISE EXCEPTION 'search_users: query must be at least 2 characters';
  END IF;

  RETURN QUERY
  SELECT u.id, u.nickname, u.avatar_path
  FROM users u
  WHERE u.nickname ILIKE '%' || p_query || '%'
    AND NOT EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = p_group_id
        AND gm.user_id = u.id
        AND gm.status IN ('invited', 'active')
    )
  ORDER BY u.nickname
  LIMIT 20;
END;
$$;

REVOKE EXECUTE ON FUNCTION search_users(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_users(uuid, text) TO authenticated;

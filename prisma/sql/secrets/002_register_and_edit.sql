-- docs/DB.md §6.2 register_secret / update_secret_before_listing / delete_secret_before_listing

CREATE OR REPLACE FUNCTION register_secret(
  p_group_id uuid,
  p_body text,
  p_summary text,
  p_category text,
  p_rarity int,
  p_asking_price int
) RETURNS secret_group_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret secrets;
  v_item secret_group_items;
BEGIN
  IF NOT is_group_member(p_group_id) THEN
    RAISE EXCEPTION 'register_secret: not a member of this group';
  END IF;

  IF p_rarity < 1 OR p_rarity > 5 THEN
    RAISE EXCEPTION 'register_secret: rarity must be between 1 and 5';
  END IF;

  IF p_asking_price < 0 THEN
    RAISE EXCEPTION 'register_secret: asking_price must be >= 0';
  END IF;

  INSERT INTO secrets (id, owner_id, body, summary, category, rarity, created_at, updated_at)
  VALUES (gen_random_uuid(), auth.uid(), p_body, p_summary, p_category, p_rarity, now(), now())
  RETURNING * INTO v_secret;

  INSERT INTO secret_group_items (id, secret_id, group_id, status, asking_price, current_value, created_at, updated_at)
  VALUES (gen_random_uuid(), v_secret.id, p_group_id, 'registered', p_asking_price, p_asking_price, now(), now())
  RETURNING * INTO v_item;

  RETURN v_item;
END;
$$;

CREATE OR REPLACE FUNCTION update_secret_before_listing(
  p_secret_id uuid,
  p_body text DEFAULT NULL,
  p_summary text DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_rarity int DEFAULT NULL,
  p_asking_price int DEFAULT NULL
) RETURNS secrets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_secret secrets;
BEGIN
  SELECT * INTO v_secret FROM secrets WHERE id = p_secret_id AND owner_id = auth.uid();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'update_secret_before_listing: not found or not owner';
  END IF;

  IF EXISTS (
    SELECT 1 FROM secret_group_items WHERE secret_id = p_secret_id AND status <> 'registered'
  ) THEN
    RAISE EXCEPTION 'update_secret_before_listing: already listed';
  END IF;

  IF p_rarity IS NOT NULL AND (p_rarity < 1 OR p_rarity > 5) THEN
    RAISE EXCEPTION 'update_secret_before_listing: rarity must be between 1 and 5';
  END IF;

  UPDATE secrets
  SET body = COALESCE(p_body, body),
      summary = COALESCE(p_summary, summary),
      category = COALESCE(p_category, category),
      rarity = COALESCE(p_rarity, rarity),
      updated_at = now()
  WHERE id = p_secret_id
  RETURNING * INTO v_secret;

  IF p_asking_price IS NOT NULL THEN
    UPDATE secret_group_items
    SET asking_price = p_asking_price, current_value = p_asking_price, updated_at = now()
    WHERE secret_id = p_secret_id;
  END IF;

  RETURN v_secret;
END;
$$;

CREATE OR REPLACE FUNCTION delete_secret_before_listing(p_secret_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM secrets WHERE id = p_secret_id AND owner_id = auth.uid()) THEN
    RAISE EXCEPTION 'delete_secret_before_listing: not found or not owner';
  END IF;

  IF EXISTS (
    SELECT 1 FROM secret_group_items WHERE secret_id = p_secret_id AND status <> 'registered'
  ) THEN
    RAISE EXCEPTION 'delete_secret_before_listing: already listed';
  END IF;

  UPDATE secrets SET deleted_at = now(), updated_at = now() WHERE id = p_secret_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION register_secret(uuid, text, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_secret(uuid, text, text, text, int, int) TO authenticated;

REVOKE EXECUTE ON FUNCTION update_secret_before_listing(uuid, text, text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_secret_before_listing(uuid, text, text, text, int, int) TO authenticated;

REVOKE EXECUTE ON FUNCTION delete_secret_before_listing(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_secret_before_listing(uuid) TO authenticated;

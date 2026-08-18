-- docs/DB.md §4.1
-- Supabase Authでのサインアップ後、オンボーディングで一度だけ呼ぶプロフィール作成RPC。
-- public.usersはauth.usersと1:1（FKなし。idを一致させる運用。docs/DB.md §4.1）。
-- prisma/sql/groups/001_rls.sqlがusersにINSERTポリシーを定義していないのは、
-- 作成経路をこのRPC（SECURITY DEFINER）だけに絞るため。
--
-- 既存プロフィールの更新（ニックネーム変更等）はここでは扱わない。usersのUPDATEは
-- users_update_self（groups/001_rls.sql）で本人に許可済みなので、Prisma経由の直接
-- UPDATEで足りる（⑮アカウント設定側の実装時に対応）。

CREATE OR REPLACE FUNCTION create_profile(p_nickname text, p_avatar_path text DEFAULT NULL)
RETURNS users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user users;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'create_profile: not authenticated';
  END IF;

  IF trim(p_nickname) = '' THEN
    RAISE EXCEPTION 'create_profile: nickname must not be empty';
  END IF;

  -- updated_atはPrisma(@updatedAt)がORM経由の書き込み時にのみ埋める列で、
  -- DB側にDEFAULTが無い（NOT NULL制約のみ）。生SQLからのINSERTでは明示が必要。
  INSERT INTO users (id, nickname, avatar_path, updated_at)
  VALUES (auth.uid(), p_nickname, p_avatar_path, now())
  RETURNING * INTO v_user;

  RETURN v_user;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_profile(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_profile(text, text) TO authenticated;

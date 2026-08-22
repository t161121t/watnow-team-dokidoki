-- docs/DB.md §4.4, §6.1（URL招待方式。issue #71）
--
-- 2026-08-22: 直接招待方式（search_users/invite_member/accept_invite/
-- decline_invite、2026-08-17導入）を廃止し、URL発行による招待に置き換えた。
-- 理由: 都度ニックネーム検索して個別招待するのが利用感として重く、
-- 「グループのURLを知っていれば誰でも参加できる」方式の方がハッカソンの
-- カジュアルな友達グループ利用に合う、という判断（issue #71、ユーザーとの
-- 相談の上で決定）。有効期限・使用回数制限は持たない（過剰と判断。旧
-- `group_invites`廃止時の判断と同じ理由。docs/DB.md §4.4参照）。取り消しは
-- revoke_group_invite_linkで行を削除するだけ。

DROP FUNCTION IF EXISTS search_users(uuid, text);
DROP FUNCTION IF EXISTS invite_member(uuid, uuid);
DROP FUNCTION IF EXISTS accept_invite(uuid);
DROP FUNCTION IF EXISTS decline_invite(uuid);

ALTER TABLE group_invite_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS group_invite_links_select_admin ON group_invite_links;
CREATE POLICY group_invite_links_select_admin ON group_invite_links
  FOR SELECT
  TO authenticated
  USING (is_group_admin(group_id));

-- insert/update/deleteは明示的なポリシーを定義しない
-- （create_group_invite_link/revoke_group_invite_link RPC経由のみ）

-- 管理者がグループの招待URL用コードを発行/再発行する。group_idがPKのため
-- 1グループにつき常に最大1つ（再発行すると古いリンクは自動的に無効になる。
-- ON CONFLICTでupsertする形で表現）。
CREATE OR REPLACE FUNCTION create_group_invite_link(p_group_id uuid)
RETURNS group_invite_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result group_invite_links;
BEGIN
  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'create_group_invite_link: not authorized';
  END IF;

  INSERT INTO group_invite_links (group_id, code, created_by, created_at)
  VALUES (p_group_id, gen_random_uuid()::text, auth.uid(), now())
  ON CONFLICT (group_id) DO UPDATE
    SET code = EXCLUDED.code, created_by = EXCLUDED.created_by, created_at = EXCLUDED.created_at
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION revoke_group_invite_link(p_group_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'revoke_group_invite_link: not authorized';
  END IF;

  DELETE FROM group_invite_links WHERE group_id = p_group_id;
END;
$$;

-- 招待コードで参加する。参加先のgroup_idはコードから引く（引数に取らない。
-- コードを知っている＝招待されている、という設計）。旧invite_member+
-- accept_inviteの2段階を1つのセルフサービスRPCに統合した。
CREATE OR REPLACE FUNCTION join_group_via_invite_link(p_code text)
RETURNS group_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link group_invite_links;
  v_existing group_members;
  v_result group_members;
  v_existing_wallet wallets;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'join_group_via_invite_link: not authenticated';
  END IF;

  SELECT * INTO v_link FROM group_invite_links WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'join_group_via_invite_link: invalid invite link';
  END IF;

  -- 同一グループのmembership変更を直列化する（006_membership_lifecycle.sqlと
  -- 同じ理由。leave/kick/role変更との競合を防ぐ）。
  PERFORM 1 FROM groups WHERE id = v_link.group_id FOR UPDATE;

  SELECT * INTO v_existing FROM group_members
  WHERE group_id = v_link.group_id AND user_id = auth.uid();

  IF FOUND AND v_existing.status = 'active' THEN
    RETURN v_existing; -- 既にメンバー（no-op。二重参加エラーにしない）
  END IF;

  IF NOT FOUND THEN
    INSERT INTO group_members (group_id, user_id, role, status, invited_by, invited_at, joined_at)
    VALUES (v_link.group_id, auth.uid(), 'member', 'active', v_link.created_by, now(), now())
    RETURNING * INTO v_result;
  ELSE
    -- 'invited'（旧経路の残骸。新方式では通常発生しない）/ 'left' / 'kicked'
    -- からの再参加
    UPDATE group_members
    SET status = 'active',
        role = 'member',
        invited_by = v_link.created_by,
        invited_at = now(),
        joined_at = now(),
        left_at = NULL
    WHERE group_id = v_link.group_id AND user_id = auth.uid()
    RETURNING * INTO v_result;
  END IF;

  -- wallet: 再参加ならbalance=0にリセット（旧accept_inviteと同じ理由。
  -- ポイント非持ち越し。機能要件.md §3参照）
  SELECT * INTO v_existing_wallet
  FROM wallets WHERE group_id = v_link.group_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO wallets (group_id, user_id, balance, created_at, updated_at)
    VALUES (v_link.group_id, auth.uid(), 0, now(), now());
  ELSE
    UPDATE wallets SET expired_at = NULL, updated_at = now()
    WHERE group_id = v_link.group_id AND user_id = auth.uid();

    IF v_existing_wallet.balance > 0 THEN
      PERFORM _debit_wallet(v_link.group_id, auth.uid(), v_existing_wallet.balance, 'admin_adjustment', 'group_members', NULL, true);
    ELSIF v_existing_wallet.balance < 0 THEN
      PERFORM _credit_wallet(v_link.group_id, auth.uid(), -v_existing_wallet.balance, 'admin_adjustment', 'group_members', NULL);
    END IF;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_group_invite_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_group_invite_link(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION revoke_group_invite_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION revoke_group_invite_link(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION join_group_via_invite_link(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION join_group_via_invite_link(text) TO authenticated;

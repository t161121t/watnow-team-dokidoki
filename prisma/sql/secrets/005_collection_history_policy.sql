-- docs/DB.md §4.1, §4.12。my_secret_collection_view（§4.9・§4.12関連）で
-- 落札後に相手（出品者⇔落札者）のニックネームを表示するために必要。
--
-- 既存のusers_select_self_or_group_member（prisma/sql/groups/001_rls.sql）は
-- 「同じグループのactiveメンバー同士」のみを許可しているため、落札後に
-- 出品者がグループを脱退・kickされると、落札者からその出品者のnicknameが
-- 見えなくなり、秘密ビューワー（⑫）の「出品者」欄が「不明」になっていた
-- （2026-08-22レビュー指摘）。
--
-- RLSのSELECTポリシーは同一テーブルに複数あってもデフォルトでOR結合される
-- （PERMISSIVE。このリポジトリでRESTRICTIVEポリシーは使っていない）ため、
-- 既存ポリシーを変更せず、「soldしたauctionの出品者⇔落札者」という限定的な
-- 関係のみを追加で許可する形にした。グループ脱退後もこの確定した取引の
-- 相手情報だけは失われない。

DROP POLICY IF EXISTS users_select_auction_counterparty ON users;
CREATE POLICY users_select_auction_counterparty ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auctions a
      WHERE a.status = 'sold'
        AND (
          (a.seller_id = users.id AND a.winner_id = auth.uid())
          OR (a.winner_id = users.id AND a.seller_id = auth.uid())
        )
    )
  );

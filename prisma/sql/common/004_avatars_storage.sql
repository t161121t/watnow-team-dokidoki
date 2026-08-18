-- docs/DB.md §4.17
-- avatarsバケット: user avatar / group icon共用の単一バケット。
-- pathは "{auth.uid()}/{ファイル名}" 固定。どちらの用途になるかはアプリ側で
-- users.avatar_path / groups.icon_path に紐付けた時点で決まる（Storage層では
-- user avatarかgroup iconかを区別しない。features/auth/actions.tsの
-- createAvatarUploadUrl参照）。
--
-- 公開設定: DB.mdでは「public または signed URL」が未確定だったため、
-- publicバケット + ランダムなファイル名（推測不可）を採用（実装時の判断。
-- 秘密の本文等の機微情報はここには置かない前提）。
--
-- 更新・削除ポリシーは意図的に用意していない（immutable運用）。理由:
-- グループのadmin権限が移った後も旧admin（アップロード者）が
-- {自分のuid}/配下への書き込み権限を持ち続けるため、update/deleteを許可すると
-- 脱退・kick後の元メンバーが現在のグループアイコンを書き換え/削除できてしまう
-- （2026-08-19 レビュー指摘で発覚）。「アイコンを変更する」は既存オブジェクトを
-- 上書きするのではなく、新しいランダムpathへ再度INSERTしてから
-- users.avatar_path / groups.icon_path を新pathに向け直す運用にする
-- （どちらもRLS: users_update_self / groups_update_admin で守られている）。
-- createSignedUploadUrlはRLS上INSERT権限のみで完結するため実装上の制約もない
-- （Supabase公式ドキュメントの `objects table permissions: insert` 参照）。

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 読み取りはpublicバケットのため誰でも可（未ログインでも画像そのものは表示できる）。
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 書き込み（新規アップロードのみ。上記コメント参照）は自分のフォルダ
-- （先頭パスセグメント = auth.uid()）のみ。
DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
CREATE POLICY avatars_owner_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 旧バージョン（このファイルの初期実装）で作成していたupdate/deleteポリシーを
-- 撤去する。immutable運用への変更（このファイル冒頭のコメント参照）。
DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;

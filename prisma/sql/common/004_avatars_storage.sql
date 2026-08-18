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

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 読み取りはpublicバケットのため誰でも可（未ログインでも画像そのものは表示できる）。
DROP POLICY IF EXISTS avatars_public_read ON storage.objects;
CREATE POLICY avatars_public_read ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');

-- 書き込みは自分のフォルダ（先頭パスセグメント = auth.uid()）のみ。
DROP POLICY IF EXISTS avatars_owner_insert ON storage.objects;
CREATE POLICY avatars_owner_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS avatars_owner_update ON storage.objects;
CREATE POLICY avatars_owner_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS avatars_owner_delete ON storage.objects;
CREATE POLICY avatars_owner_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- docs/DB.md §4.17
-- challenge-evidenceバケット: チャレンジ証拠写真専用（avatarsとは別。理由は下記）。
-- 状態は「未実装（challengesドメイン未着手）」だったが、⑧チャレンジのUI接続
-- （2026-08-22）に合わせて実装する。
--
-- avatarsと異なりprivateにする（証拠写真は不特定多数に公開する情報ではない
-- ため。avatarsのコメント「秘密の本文等の機微情報はここには置かない前提」
-- 参照）。pathは"{アップロードしたuserId}/{ランダムなファイル名}"固定
-- （avatarsと同じ規約。lib/supabase/storage.ts参照）。
--
-- 書き込みは自分のフォルダのみ（avatarsと同じ、insert-onlyのimmutable運用。
-- 「撮り直し」は新しいpathへの再アップロード＋evidence_pathの向け直しで行う。
-- ただしevidence_pathの更新自体はsubmit_challenge RPCが1回しか呼ばれない
-- 前提のため、実質「提出前に選び直す」場合はクライアント側で古いpathを
-- 使い捨てるだけで足りる）。
--
-- 読み取りはprivateバケットのため、Storage APIが素のURLで配信しない。
-- 署名付きURL（createSignedUrl）はRLSのSELECT権限がある場合のみ発行できる
-- ため、「誰が読めるか」はここのSELECTポリシーで決める:
--   1. アップロード本人（提出前のプレビュー・自分の履歴で見返す用）
--   2. challenge_attempts.evidence_path経由でこのpathを参照している行の
--      groupのアクティブメンバー（承認/却下時に写真を確認する必要がある。
--      approve_challenge RPCがis_group_memberのみを要求しadmin限定では
--      ないため、ここも同じ条件にする。prisma/sql/challenges/
--      002_submit_and_review.sql参照）

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'challenge-evidence',
  'challenge-evidence',
  false,
  5242880, -- 5MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS challenge_evidence_owner_insert ON storage.objects;
CREATE POLICY challenge_evidence_owner_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'challenge-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS challenge_evidence_select_self_or_group_member ON storage.objects;
CREATE POLICY challenge_evidence_select_self_or_group_member ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'challenge-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM challenge_attempts ca
        WHERE ca.evidence_path = storage.objects.name
          AND is_group_member(ca.group_id)
      )
    )
  );

-- docs/アーキテクチャ.md §5（未確定事項として記載されていたRealtime購読パターンの1つ目の対応）
-- auctionsテーブルの変更をSupabase Realtime（postgres_changes）で購読できるように、
-- supabase_realtime publicationに追加する。書き込み側（Prisma経由のUPDATE）に
-- 変更は不要（PostgresのWALをそのまま流すだけのため）。
--
-- RLSはauctions_select_member（001_rls.sql）がそのままRealtimeの配信にも
-- 適用される（authenticated roleへのSELECT grantはcommon/003_table_grants.sqlで
-- 付与済み）。
--
-- ALTER PUBLICATION ... ADD TABLE は再実行するとエラーになる（既にメンバーの場合）
-- ため、pg_publication_tablesで存在確認してから実行する（何度実行しても壊れない
-- ようにする、というprisma/sql/README.mdのルールに合わせるため）。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auctions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE auctions;
  END IF;
END $$;

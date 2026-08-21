-- docs/技術選定.md §5、docs/アーキテクチャ.md §5（finalize_due_auctionsの定期実行基盤。issue #43）
--
-- 2026-08-21: pg_cronからEdge Function経由で叩く案も検討したが、
-- finalize_due_auctions自体が外部HTTP呼び出しを必要としない純粋なPL/pgSQL
-- 関数のため、pg_cronから直接呼ぶ方式を採用した（ネットワークホップ・
-- Edge Functionのコールドスタート・デプロイ/認証まわりの実装が不要になる。
-- ユーザーとの相談の上で決定）。
--
-- 実行間隔は毎分。finalize_due_auctions自体はopenかつends_at<=nowの
-- オークションと、finalizing状態のまま5分以上止まっているものだけを
-- 拾う軽量な処理（prisma/sql/auctions/005_finalize.sql参照）ため、
-- 毎分実行しても問題ない想定。1件の失敗が他のauctionを巻き込まないことは
-- finalize_due_auctions側で担保している（同ファイル参照。2026-08-22
-- PRレビュー反映）。
--
-- cron.schedule(job_name, ...) は同名ジョブが既に存在する場合は更新して
-- くれる（pg_cronの仕様）が、バージョン差異に依存しないよう明示的に
-- unschedule → scheduleする形で冪等にする（何度実行しても壊れないように、
-- というprisma/sql/README.mdのルールに合わせるため）。
--
-- 2026-08-22 PRレビュー指摘: このリポジトリは`npm run db:dev`（ローカルの
-- Prisma Postgres）もサポートしており、そちらにはpg_cron拡張自体が提供
-- されていない。pg_available_extensionsで拡張の提供有無を先に確認し、
-- 無ければ何もせず正常終了する（Supabase専用のステップとして扱う）。
--
-- 【手動でのロールバック/停止】このSQLをGit上でrevertしても、既にDBに
-- 登録済みのcronジョブは自動的には消えない（prisma/sql配下のファイルは
-- 追加的に適用されるだけで、削除に対応する仕組みが無いため）。止めたい
-- 場合はDB接続して以下を実行する:
--   SELECT cron.unschedule('finalize-due-auctions');

DO $cron_setup$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
    RAISE NOTICE 'finalize-due-auctions cron skipped: pg_cron extension not available in this Postgres (expected on non-Supabase Postgres such as npm run db:dev)';
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- DOブロック内でCREATE EXTENSIONを直接呼ぶとバージョンによって
    -- 挙動が不安定なため、EXECUTEで動的SQLとして実行する
    EXECUTE 'CREATE EXTENSION pg_cron';
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finalize-due-auctions') THEN
    PERFORM cron.unschedule('finalize-due-auctions');
  END IF;

  PERFORM cron.schedule(
    'finalize-due-auctions',
    '* * * * *',
    $cmd$SELECT finalize_due_auctions()$cmd$
  );
END $cron_setup$;

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
-- 毎分実行しても問題ない想定。
--
-- cron.schedule(job_name, ...) は同名ジョブが既に存在する場合は更新して
-- くれる（pg_cronの仕様）が、バージョン差異に依存しないよう明示的に
-- unschedule → scheduleする形で冪等にする（何度実行しても壊れないように、
-- というprisma/sql/README.mdのルールに合わせるため）。

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron_setup$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'finalize-due-auctions') THEN
    PERFORM cron.unschedule('finalize-due-auctions');
  END IF;

  PERFORM cron.schedule(
    'finalize-due-auctions',
    '* * * * *',
    $cmd$SELECT finalize_due_auctions()$cmd$
  );
END $cron_setup$;

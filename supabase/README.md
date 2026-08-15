# supabase

Supabase CLI が管理する Backend 資産を置く。公式構成に近い形を保ち、責務は次のように分ける。

- `migrations/`: テーブル、RLS、PostgreSQL Function、trigger などのスキーマ変更
- `functions/<function-name>/`: 外部 HTTP、Storage、通知などを扱う Edge Function
- `functions/tests/`: Edge Functions の Deno テスト
- `tests/database/`: DB、RLS、PostgreSQL Function の pgTAP テスト
- `seed.sql`: ローカル開発用の初期データ
- `config.toml` / `deno.json` / `deno.lock`: Supabase CLI と Deno の設定

複数テーブルの整合性が必要な処理は migration で定義する PostgreSQL Function に置き、外部 I/O を伴う処理だけを Edge Functions に置く。

全体の配置基準は [`docs/ディレクトリ構成.md`](../docs/ディレクトリ構成.md) を参照する。

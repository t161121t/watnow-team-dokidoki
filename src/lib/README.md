# lib

Frontend 全体を支える、機能に依存しない基盤コードを置く。

現在は環境変数の検証、Supabase client、汎用 className utility を管理する。入札やポイント計算などの業務ロジック、機能固有の Query や schema は置かない。

全体の配置基準は [`docs/ディレクトリ構成.md`](../../docs/ディレクトリ構成.md) を参照する。

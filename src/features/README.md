# features

機能固有の UI、Query、mutation、schema、React hook、テストを機能単位でまとめる。

- 各直下ディレクトリを一つの機能境界とする
- 最初はファイルを直下に置き、増えてから `components/` などへ分割する
- テストは対象ファイルの近くに置く
- URL や search parameter などルーティング固有の処理は `src/routes/` に置く
- 未実装機能の空ディレクトリは作らない

`auth/`、`groups/`、`secrets/`、`auctions/`、`challenges/` は、それぞれの実装を始める時点で追加する。

全体の配置基準は [`docs/ディレクトリ構成.md`](../../docs/ディレクトリ構成.md) を参照する。

# routes

TanStack Router のファイルベースルートを置く。責務は URL と画面の接続に限定する。

ここに置くもの:

- path parameter と search parameter の検証
- guard、loader、redirect
- route metadata
- `features/` の画面との接続

機能固有の UI、Query、mutation、schema は `src/features/` に置く。`src/routeTree.gen.ts` は自動生成物なので直接編集しない。

全体の配置基準は [`docs/ディレクトリ構成.md`](../../docs/ディレクトリ構成.md) を参照する。

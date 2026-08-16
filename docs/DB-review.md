# DB.md レビュー指摘（修正候補）

ステータス: 1・2・4 対応済み / 3・5 未対応
作成日: 2026-08-16
更新日: 2026-08-16
対象: `docs/DB.md`
参照: `docs/PRD.md` / `docs/TRD.md` / `docs/オークションルール.md` / `docs/コンセプト変更まとめ.md`

---

## 1. `auctions` の「制約」に他テーブル依存のルールが混在 → 対応済み

- 該当箇所: `DB.md` §4.10 `auctions` の制約リスト
- 問題:
`dealer_id は当該 auction に入札不可` / `seller_id は当該 auction に入札不可` は、実際には `bids` への insert 時にしか検証できないルールであり、`auctions` テーブル自体の check constraint ではない。同じ内容が §4.11 `bids` 側にも RPC 制約として重複して書かれており、`auctions` 側の記載は誤解を招く。
- 対応内容:
§4.10 の制約リストからこの 2 行を削除し、「`dealer_id` / `seller_id` は当該 auction に入札できない。`place_bid` RPC 側で保証する（§4.11 参照）」という注記に置き換えた。

## 2. `auction_status.finalizing` が実質未使用 → 対応済み

- 該当箇所: `DB.md` §3 Enum（`auction_status`）、§10.2 落札確定
- 問題:
§10.2 の確定処理は `auctions` 行を `FOR UPDATE` した後、同一トランザクション内で一気に `sold` / `no_sale` へ遷移させており、`finalizing` へ遷移するステップが存在しない。同一 TX で完結する限り誰からも観測されない状態になり、死んだ enum 値になっている可能性がある。
- 対応内容:
`finalize_auction` を 2 段階に分割した。
  - **Stage A**（`claim_auction_for_finalize`）: `open` かつ `ends_at` 到達済みの auction を `finalizing` にクレームして commit。cron の重複起動防止と、クライアントへの「確定処理中」表示を兼ねる
  - **Stage B**（`finalize_auction`）: `finalizing` の auction を対象に、按分・debit・credit・閲覧権付与を行い `sold` / `no_sale` に確定

§6.3 の RPC 一覧・lock 方針、§10.2 のトランザクション設計を更新済み。

## 3. ER 図（§2）とテーブル定義の不整合

- 該当箇所: `DB.md` §2 論理 ER
- 問題:
  - `groups 1─* challenges` は §4.14 `challenges.group_id` が nullable（システム共通チャレンジは `group_id = null`）である点と矛盾する。図では必須の 1-* 関係に見えるが、実際は 0..1 相当。
  - `group_auction_settings`（`groups` と 1-1）が ER 図に出てきていない。
- 修正案:
  - `challenges` との関係線を任意（0..1 または点線）に修正するか、注記を添える。
  - `groups 1 ─ 1 group_auction_settings` を ER 図に追加する。

## 4. `finalize_auction` で winner 残高不足だった場合の分岐が未設計（DB-2 関連） → 対応済み

- 該当箇所: `DB.md` §10.2 落札確定、§14 DB-2
- 問題:
§10.2 の注記で「安全側では finalize 時にも `balance >= final_price` を要求」としているが、これが失敗した場合に
  - オークションを `no_sale` 扱いにするのか
  - 次点入札者へ繰り上げるのか
  - その他の処理か
  が決まっていなかった。
- 対応内容:
**次点繰り上げ方式**を採用（§10.2.1 として新設）。
  - 確定時（Stage B）に bid を金額降順で候補として並べ、先頭から順に bidder の残高を確認する
  - 残高不足の候補は `bids.status = 'failed'` にして無効化し、次点へ進む
  - 残高を満たす候補が見つかればその bid を `winning` にし、**その候補自身の入札額**を `final_price` として確定する（トップ入札者の額ではない）
  - 候補を全て使い切っても誰も支払えなければ `no_sale` 処理へ

  `bid_status` enum に `failed` を追加し、§4.11・§10.2・§10.2.1・§13 テスト観点・§14（本項目）を更新済み。

## 5. `secret_group_items.seller_id` が `secrets.owner_id` と異なるケースの扱いが未記載

- 該当箇所: `DB.md` §4.9 `secret_group_items`
- 問題:
「`seller_id` は基本 `secrets.owner_id`」とあるだけで、両者が異なり得るケース（権利委譲、共同出品など Phase 2 相当の想定）に触れていない。MVP で常に一致する前提なら、その旨を明記した方が実装時に安全側で固定しやすい。
- 修正案:
MVP では `seller_id = secrets.owner_id` を常に成立させる前提であることを明記する（あるいは、異なり得るケースがあるなら具体的に列挙する）。

---

## 優先度目安（残作業）

| 優先度 | 項目 |
| --- | --- |
| 低 | 3. ER 図の整合、5. seller_id の前提明記 |

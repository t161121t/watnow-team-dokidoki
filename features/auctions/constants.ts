/**
 * オークションパラメータ P1〜P12（`PRD.md` §6 が正）のうち、
 * 全グループ共通で固定の値。`group_auction_settings` テーブルを廃止した
 * 代わりにアプリ定数として持つ（`docs/DB.md` §4.5）。
 *
 * グループごとに変わる値（P2: 開催時間）は `groups.auction_open_seconds`
 * に持つため、ここには含めない。
 *
 * 注意: PostgreSQL Function（`prisma/sql/auctions/*.sql`）側にも
 * 同じ値がリテラルとして書かれている。ここを変更したら、対応する
 * SQLファイルも必ず一緒に変更すること（`docs/DB.md` §4.5 参照）。
 */
export const AUCTION_CONSTANTS = {
  /** P3: 開始価格 = 出品価格 * multiplier + add */
  startPriceAdd: 0,
  startPriceMultiplier: 1,

  /** P4: 出品時の前払い率（出品価格に対する割合） */
  listingPrepayRate: 1.0,

  /** P5: 落札時の追加振込率（0 = なし） */
  sellerBonusRate: 0,

  /** P6: 不落札時、秘密の価値がこの割合だけ下がる */
  noSaleDepreciationRate: 0.2,

  /** P7: 落札価格の按分比（合計が1になること） */
  sellerShareRate: 0.7,
  dealerShareRate: 0.3,

  /** P9: ディーラーへの入札者開示（常にtrue。フラグ分岐は作らない） */
  dealerCanSeeBidders: true,

  /** P11: マイナス残高の上限（nullは上限なし） */
  minBalanceLimit: null as number | null,

  /** P12: ディーラー辞退料率（出品価格に対する割合。完全没収） */
  dealerDeclineFeeRate: 0.05,
} as const;

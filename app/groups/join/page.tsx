import { redirect } from "next/navigation";

/**
 * 旧「グループ参加/作成」ハブ画面。招待URL方式への移行（issue #71）で
 * 役割が「新規作成への導線」だけになっていたため、/groups の空状態へ
 * 統合して画面自体は廃止した。旧リンク・ブックマーク対策として
 * /groups へのリダイレクトのみ残す。
 * （招待URLの着地ページ /groups/join/[code] は別物で、現役のまま）
 */
export default function GroupJoinPage() {
  redirect("/groups");
}

import { redirect } from "next/navigation";

/**
 * 旧・チャレンジ承認画面。承認待ちキューはチャレンジ一覧のタブ
 * （/groups/[groupId]/challenges?tab=review）へ統合されたため、
 * 既存リンク・ブックマーク切れ防止のリダイレクトのみを残す。
 */
export default async function ChallengeApprovalPage({
  params,
}: PageProps<"/groups/[groupId]/challenges/review">) {
  const { groupId } = await params;

  redirect(`/groups/${groupId}/challenges?tab=review`);
}

import { ChallengeDetailScreen } from "@/features/challenges/components/challenge-detail-screen";

export default async function ChallengeDetailPage({
  params,
}: PageProps<"/groups/[groupId]/challenges/[challengeId]">) {
  const { groupId, challengeId } = await params;

  return <ChallengeDetailScreen groupId={groupId} challengeId={challengeId} />;
}

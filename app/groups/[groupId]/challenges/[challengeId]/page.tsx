import { notFound } from "next/navigation";

import { ChallengeDetailScreen } from "@/features/challenges/components/challenge-detail-screen";
import { getChallenge, getNextChallengeId } from "@/lib/mocks/challenges";
import { getGroup } from "@/lib/mocks/groups";

export default async function ChallengeDetailPage({
  params,
}: PageProps<"/groups/[groupId]/challenges/[challengeId]">) {
  const { groupId, challengeId } = await params;
  const challenge = getChallenge(challengeId);

  if (!challenge) {
    notFound();
  }

  return (
    <ChallengeDetailScreen
      group={getGroup(groupId)}
      challenge={challenge}
      nextChallengeId={getNextChallengeId(challengeId)}
    />
  );
}

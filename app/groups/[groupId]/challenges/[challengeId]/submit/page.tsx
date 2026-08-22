import { notFound } from "next/navigation";

import { ChallengeEvidenceScreen } from "@/features/challenges/components/challenge-evidence-screen";
import { getChallenge } from "@/lib/mocks/challenges";
import { getGroup } from "@/lib/mocks/groups";

export default async function ChallengeEvidencePage({
  params,
}: PageProps<"/groups/[groupId]/challenges/[challengeId]/submit">) {
  const { groupId, challengeId } = await params;
  const challenge = getChallenge(challengeId);

  if (!challenge) {
    notFound();
  }

  return <ChallengeEvidenceScreen group={getGroup(groupId)} challenge={challenge} />;
}

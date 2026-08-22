import { ChallengeEvidenceScreen } from "@/features/challenges/components/challenge-evidence-screen";
import { getChallenge } from "@/lib/mocks/challenges";
import { getGroup } from "@/lib/mocks/groups";

export default async function ChallengeEvidencePage({
  params,
}: PageProps<"/groups/[groupId]/challenges/[challengeId]/submit">) {
  const { groupId, challengeId } = await params;

  return (
    <ChallengeEvidenceScreen
      group={getGroup(groupId)}
      challenge={getChallenge(challengeId)}
    />
  );
}

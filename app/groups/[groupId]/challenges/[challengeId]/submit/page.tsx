import { ChallengeEvidenceLoader } from "@/features/challenges/components/challenge-evidence-loader";

export default async function ChallengeEvidencePage({
  params,
}: PageProps<"/groups/[groupId]/challenges/[challengeId]/submit">) {
  const { groupId, challengeId } = await params;

  return <ChallengeEvidenceLoader groupId={groupId} challengeId={challengeId} />;
}

import { ChallengeScreen } from "@/features/challenges/components/challenge-screen";
import { mockChallenges } from "@/lib/mocks/challenges";
import { getGroup } from "@/lib/mocks/groups";

export default async function ChallengesPage({
  params,
}: PageProps<"/groups/[groupId]/challenges">) {
  const { groupId } = await params;

  return <ChallengeScreen group={getGroup(groupId)} challenges={mockChallenges} />;
}

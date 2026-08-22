import { ChallengeApprovalScreen } from "@/features/challenges/components/challenge-approval-screen";

export default async function ChallengeApprovalPage({
  params,
}: PageProps<"/groups/[groupId]/challenges/review">) {
  const { groupId } = await params;

  return <ChallengeApprovalScreen groupId={groupId} />;
}

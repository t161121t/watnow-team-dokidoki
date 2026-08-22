import { ChallengeScreen } from "@/features/challenges/components/challenge-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";

export default async function ChallengesPage({
  params,
}: PageProps<"/groups/[groupId]/challenges">) {
  const { groupId } = await params;

  return (
    <ChallengeScreen
      groupId={groupId}
      balanceSection={
        <WalletBalance
          groupId={groupId}
          className="mt-1 text-[30px] leading-none font-black"
        />
      }
    />
  );
}

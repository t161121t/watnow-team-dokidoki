import { parseChallengeListTab } from "@/features/challenges/challenge-list-tab";
import { ChallengeScreen } from "@/features/challenges/components/challenge-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";

export default async function ChallengesPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/challenges">) {
  const [{ groupId }, { tab }] = await Promise.all([params, searchParams]);

  return (
    <ChallengeScreen
      groupId={groupId}
      tab={parseChallengeListTab(tab)}
      balanceSection={
        <WalletBalance
          groupId={groupId}
          className="mt-1 text-[30px] leading-none font-black"
        />
      }
    />
  );
}

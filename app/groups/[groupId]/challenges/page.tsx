import { parseChallengeListTab } from "@/features/challenges/challenge-list-tab";
import { ChallengeScreen } from "@/features/challenges/components/challenge-screen";
import { getMyGroupSummary } from "@/features/groups/actions";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";

export default async function ChallengesPage({
  params,
  searchParams,
}: PageProps<"/groups/[groupId]/challenges">) {
  const [{ groupId }, { tab }] = await Promise.all([params, searchParams]);

  // 「作成」ボタンをadminにだけ出す判定（groupsドメイン、cross-domain）。
  // ここでnull（未ログイン/非メンバー）でも、ChallengeScreen自身が
  // 改めてログイン確認・グループ確認を行うためisAdmin=falseにするだけで
  // 十分（作成ボタンが出ないだけで、実際のガードはChallengeScreen側）。
  const group = await getMyGroupSummary({ groupId });

  return (
    <ChallengeScreen
      groupId={groupId}
      tab={parseChallengeListTab(tab)}
      isAdmin={group?.role === "admin"}
      balanceSection={
        <WalletBalance
          groupId={groupId}
          className="mt-1 text-[30px] leading-none font-black"
        />
      }
    />
  );
}

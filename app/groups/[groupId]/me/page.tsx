import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/features/auth/actions";
import { ProfileScreen } from "@/features/users/components/profile-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";
import { getSecretsForGroup } from "@/lib/mocks/secrets";

export default async function MyPage({
  params,
}: PageProps<"/groups/[groupId]/me">) {
  const { groupId } = await params;
  const collection = getSecretsForGroup(groupId).filter(
    (secret) => secret.viewRole === "winner",
  );
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/me`)}`);
  }

  return (
    <ProfileScreen
      groupId={groupId}
      user={{
        id: profile.id,
        nickname: profile.nickname ?? "ゲスト",
        email: profile.email,
      }}
      balanceSection={<WalletBalance groupId={groupId} className="mt-1 font-black" />}
      collection={collection}
    />
  );
}

import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUserProfile } from "@/features/auth/actions";
import { ProfileScreen } from "@/features/users/components/profile-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";
import { getSecretsForGroup } from "@/lib/mocks/secrets";

export default async function MyPage({
  params,
}: PageProps<"/groups/[groupId]/me">) {
  const { groupId } = await params;

  // グループ切替（/groups）はまだモックデータのままで、UUIDでないID
  // （"night-owls"等）を渡してくることがある。WalletBalance内部のzod
  // （UUID必須）にそのまま投げると例外で落ちるため、ここで先に弾いて404にする
  // （2026-08-22レビュー指摘）。
  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

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

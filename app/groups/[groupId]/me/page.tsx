import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUserProfile } from "@/features/auth/actions";
import { listMyWinnings } from "@/features/secrets/actions";
import { ProfileScreen } from "@/features/users/components/profile-screen";
import { WalletBalance } from "@/features/wallet/components/wallet-balance";
import type { ProfileCollectionItem } from "@/features/users/components/profile-screen";

export default async function MyPage({
  params,
}: PageProps<"/groups/[groupId]/me">) {
  const { groupId } = await params;

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/me`)}`);
  }

  // secretsドメインの読み取り（落札コレクション）はusersドメインのこのページ
  // から見るとcross-domain。features/secrets/actions.ts経由で取得する
  // （cross-domainのread唯一の許容経路）。
  const winnings = await listMyWinnings({ groupId });
  const collection: ProfileCollectionItem[] = winnings.map((row) => ({
    id: row.secret_id,
    title: row.title,
  }));

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

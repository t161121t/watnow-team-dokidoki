import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getAuthenticatedUserId } from "@/features/auth/actions";
import { getGroup } from "@/features/groups/actions";
import { CreateSecretScreen } from "@/features/secrets/components/create-secret-screen";

export default async function NewSecretPage({
  params,
}: PageProps<"/groups/[groupId]/secrets/new">) {
  const { groupId } = await params;

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/secrets/new`)}`);
  }

  // groupIdのactiveメンバーかを確認する。ログイン確認だけだと、他グループの
  // UUIDを知っていれば非メンバーでも登録フォームが表示できてしまい、
  // グループ完全分離の方針に反する（register_secret RPC自体は非メンバーを
  // 拒否するため実害は無いが、表示そのものを避ける。2026-08-23レビュー指摘）。
  const group = await getGroup({ groupId });
  if (!group) {
    notFound();
  }

  return <CreateSecretScreen groupId={groupId} />;
}

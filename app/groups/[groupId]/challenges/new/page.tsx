import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { CreateChallengeScreen } from "@/features/challenges/components/create-challenge-screen";
import { getAuthenticatedUserId } from "@/features/auth/actions";
import { getMyGroupSummary } from "@/features/groups/actions";

export default async function NewChallengePage({
  params,
}: PageProps<"/groups/[groupId]/challenges/new">) {
  const { groupId } = await params;

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const userId = await getAuthenticatedUserId();
  if (!userId) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/challenges/new`)}`);
  }

  // create_group_challenge RPC自体もis_group_adminを要求するため実害は
  // 無いが、非adminにフォーム自体を見せないためここでも確認する
  // （2026-08-23、他の/newページと同じグループ完全分離の方針）。
  const group = await getMyGroupSummary({ groupId });
  if (!group || group.role !== "admin") {
    notFound();
  }

  return <CreateChallengeScreen groupId={groupId} />;
}

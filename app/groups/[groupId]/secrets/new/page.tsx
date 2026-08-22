import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUserProfile } from "@/features/auth/actions";
import { CreateSecretScreen } from "@/features/secrets/components/create-secret-screen";

export default async function NewSecretPage({
  params,
}: PageProps<"/groups/[groupId]/secrets/new">) {
  const { groupId } = await params;

  if (!z.string().uuid().safeParse(groupId).success) {
    notFound();
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect(`/login?redirect_to=${encodeURIComponent(`/groups/${groupId}/secrets/new`)}`);
  }

  return <CreateSecretScreen groupId={groupId} />;
}

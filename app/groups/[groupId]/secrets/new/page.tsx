import { CreateSecretScreen } from "@/features/secrets/components/create-secret-screen";

export default async function NewSecretPage({
  params,
}: PageProps<"/groups/[groupId]/secrets/new">) {
  const { groupId } = await params;

  return <CreateSecretScreen groupId={groupId} />;
}

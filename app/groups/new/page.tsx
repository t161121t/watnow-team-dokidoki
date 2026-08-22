import { CreateGroupScreen } from "@/features/groups/components/create-group-screen";

export default async function NewGroupPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const backHref = from === "join" ? "/groups/join" : "/groups";

  return <CreateGroupScreen backHref={backHref} />;
}

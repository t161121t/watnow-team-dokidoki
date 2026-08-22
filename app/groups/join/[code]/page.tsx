import { JoinViaLinkScreen } from "@/features/groups/components/join-via-link-screen";

export default async function JoinViaLinkPage({
  params,
}: PageProps<"/groups/join/[code]">) {
  const { code } = await params;

  return <JoinViaLinkScreen code={code} />;
}

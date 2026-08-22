import { InvitationsScreen } from "@/features/groups/components/invitations-screen";
import { mockInvitations } from "@/lib/mocks/groups";

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const backHref = from === "join" ? "/groups/join" : "/groups";

  return (
    <InvitationsScreen invitations={mockInvitations} backHref={backHref} />
  );
}

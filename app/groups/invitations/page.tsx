import { InvitationsScreen } from "@/features/groups/components/invitations-screen";
import { mockInvitations } from "@/lib/mocks/groups";

export default function InvitationsPage() {
  return <InvitationsScreen invitations={mockInvitations} />;
}

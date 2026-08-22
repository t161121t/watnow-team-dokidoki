import { GroupEntryScreen } from "@/features/groups/components/group-entry-screen";
import { mockInvitations } from "@/lib/mocks/groups";

export default function GroupJoinPage() {
  return <GroupEntryScreen invitationCount={mockInvitations.length} />;
}

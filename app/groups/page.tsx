import { GroupSwitcherScreen } from "@/features/groups/components/group-switcher-screen";
import { mockGroups } from "@/lib/mocks/groups";

export default function GroupsPage() {
  return <GroupSwitcherScreen groups={mockGroups} />;
}

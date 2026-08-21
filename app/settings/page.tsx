import { SettingsScreen } from "@/features/users/components/settings-screen";
import { currentUser } from "@/lib/mocks/users";

export default function SettingsPage() {
  return <SettingsScreen user={currentUser} />;
}

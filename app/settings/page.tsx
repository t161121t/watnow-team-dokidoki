import { redirect } from "next/navigation";

import { SettingsScreen } from "@/features/users/components/settings-screen";
import { getCurrentUserProfile } from "@/features/auth/actions";

export default async function SettingsPage({
  searchParams,
}: PageProps<"/settings">) {
  const { from } = await searchParams;
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <SettingsScreen
      user={{
        id: profile.id,
        nickname: profile.nickname ?? "ゲスト",
        email: profile.email,
      }}
      backHref={typeof from === "string" && from.startsWith("/") ? from : "/groups"}
    />
  );
}

import { redirect } from "next/navigation";

import { getCurrentUserProfile, signOut } from "@/features/auth/actions";
import { SettingsScreen } from "@/features/users/components/settings-screen";
import { isSafeRedirectPath } from "@/lib/redirect-path";

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
      backHref={typeof from === "string" && isSafeRedirectPath(from) ? from : "/groups"}
      onLogout={signOut}
    />
  );
}

import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/features/auth/actions";
import { LoginScreen } from "@/features/auth/components/onboarding-flow";
import { getMyGroups } from "@/features/groups/actions";
import { isSafeRedirectPath, postAuthDestination } from "@/lib/redirect-path";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { redirect_to } = await searchParams;
  const redirectTo =
    typeof redirect_to === "string" && isSafeRedirectPath(redirect_to) ? redirect_to : undefined;

  const userId = await getAuthenticatedUserId();
  if (userId) {
    if (redirectTo) {
      redirect(redirectTo);
    }
    const myGroups = await getMyGroups();
    redirect(postAuthDestination(myGroups));
  }

  return <LoginScreen redirectTo={redirectTo} />;
}

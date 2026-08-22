import { redirect } from "next/navigation";

import { getAuthenticatedUserId } from "@/features/auth/actions";
import { SignupScreen } from "@/features/auth/components/signup-screen";
import { getMyGroups } from "@/features/groups/actions";
import { postAuthDestination } from "@/lib/redirect-path";

export default async function SignupPage() {
  const userId = await getAuthenticatedUserId();
  if (userId) {
    const myGroups = await getMyGroups();
    redirect(postAuthDestination(myGroups));
  }

  return <SignupScreen />;
}

import { LoginScreen } from "@/features/auth/components/onboarding-flow";
import { isSafeRedirectPath } from "@/lib/redirect-path";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { redirect_to } = await searchParams;
  const redirectTo =
    typeof redirect_to === "string" && isSafeRedirectPath(redirect_to) ? redirect_to : undefined;

  return <LoginScreen redirectTo={redirectTo} />;
}

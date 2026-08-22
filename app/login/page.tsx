import { LoginScreen } from "@/features/auth/components/onboarding-flow";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { redirect_to } = await searchParams;
  const redirectTo = typeof redirect_to === "string" && redirect_to.startsWith("/")
    ? redirect_to
    : undefined;

  return <LoginScreen redirectTo={redirectTo} />;
}

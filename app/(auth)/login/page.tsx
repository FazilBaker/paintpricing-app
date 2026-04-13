import { AuthForm } from "@/components/auth/auth-form";
import { signInAction } from "@/app/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return <AuthForm mode="login" action={signInAction} error={params.error} />;
}

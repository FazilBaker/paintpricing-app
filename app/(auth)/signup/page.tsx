import Link from "next/link";

import { AuthForm } from "@/components/auth/auth-form";
import { signUpAction } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; confirm?: string }>;
}) {
  const params = await searchParams;

  if (params.confirm) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-3xl">✉️</p>
            <h1 className="text-xl font-bold">Check your email</h1>
            <p className="text-sm text-[var(--muted)]">
              We sent a confirmation link to your email. Click it to activate your account, then log in.
            </p>
          </div>
          <Button asChild size="lg" className="w-full">
            <Link href="/login">Go to login</Link>
          </Button>
        </div>
      </main>
    );
  }

  return <AuthForm mode="signup" action={signUpAction} error={params.error} />;
}

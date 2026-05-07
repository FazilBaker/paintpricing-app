import Link from "next/link";

import { forgotPasswordAction } from "@/app/actions";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="container-shell flex min-h-dvh items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-lg font-bold text-[var(--brand)]">PaintPricing</p>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="text-sm text-[var(--muted)]">
              Enter your email and we will send you a reset link.
            </p>
          </div>

          {params.success ? (
            <div className="rounded-[var(--radius)] border border-[var(--success)]/20 bg-[var(--success-soft)] px-4 py-3 text-sm text-[var(--success)]">
              Check your email for a password reset link.
            </div>
          ) : null}

          <form action={forgotPasswordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@company.com"
                required
              />
            </div>
            {params.error ? (
              <div className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {params.error}
              </div>
            ) : null}
            <SubmitButton
              className="w-full"
              size="lg"
              pendingLabel="Sending…"
            >
              Send reset link
            </SubmitButton>
          </form>

          <p className="text-center text-sm text-[var(--muted)]">
            Remember your password?{" "}
            <Link className="font-semibold text-[var(--brand)]" href="/login">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

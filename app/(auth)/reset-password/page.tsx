import { resetPasswordAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="container-shell flex min-h-dvh items-center justify-center py-12">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6">
          <div className="space-y-2 text-center">
            <p className="text-lg font-bold text-[var(--brand)]">PaintPricing</p>
            <h1 className="text-2xl font-bold">Set a new password</h1>
            <p className="text-sm text-[var(--muted)]">
              Enter your new password below.
            </p>
          </div>

          <form action={resetPasswordAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                minLength={8}
                placeholder="At least 8 characters"
                required
              />
            </div>
            {params.error ? (
              <div className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {params.error}
              </div>
            ) : null}
            <Button className="w-full" size="lg" type="submit">
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

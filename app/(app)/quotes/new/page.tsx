import Link from "next/link";
import { redirect } from "next/navigation";

import { canCreateQuote, getViewer, hasConfiguredRates } from "@/lib/auth";
import { QuoteBuilder } from "@/components/quotes/quote-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewQuotePage() {
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect("/login");
  }

  if (!hasConfiguredRates(viewer.profile)) {
    redirect("/onboarding");
  }

  if (!viewer.profile) {
    redirect("/dashboard");
  }

  if (!canCreateQuote(viewer.profile)) {
    return (
      <main className="container-shell pb-20">
        <Card>
          <CardContent className="space-y-5 p-8">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Upgrade required
            </p>
            <h1 className="font-display text-4xl font-bold">
              Your 3 free quotes are used up.
            </h1>
            <p className="max-w-2xl text-[var(--muted)]">
              Upgrade to monthly, yearly, or claim one of the first-50 lifetime spots to keep creating quotes.
            </p>
            <Button asChild size="lg">
              <Link href="/billing">View pricing</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="container-shell pb-20">
      <Card className="mb-6">
        <CardContent className="space-y-2">
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
            Quote builder
          </p>
          <h1 className="font-display text-4xl font-bold">
            Room math, gallons, labor, and totals in one place
          </h1>
          <p className="max-w-3xl text-[var(--muted)]">
            Doors and windows are deducted from wall paint area automatically.
            Turn on separate line items when you plan to paint them.
          </p>
        </CardContent>
      </Card>
      <QuoteBuilder profile={viewer.profile} />
    </main>
  );
}

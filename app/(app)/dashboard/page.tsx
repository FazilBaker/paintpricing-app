import Link from "next/link";
import { redirect } from "next/navigation";

import {
  canCreateQuote,
  getViewer,
  hasConfiguredRates,
  hasPaidAccess,
  quotesRemaining,
} from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function DashboardPage() {
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect("/login");
  }

  if (!hasConfiguredRates(viewer.profile)) {
    redirect("/onboarding");
  }

  const supabase = await createSupabaseServerClient();
  const { data: quotes } = await supabase!
    .from("quotes")
    .select("id, client_name, project_address, total, created_at, pdf_url")
    .eq("user_id", viewer.user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="container-shell pb-20">
      <section className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
        <Card>
          <CardContent className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Dashboard
                </p>
                <h1 className="mt-2 font-display text-4xl font-bold">
                  Ready for the next quote.
                </h1>
              </div>
              <Button asChild size="lg">
                <Link href="/quotes/new">New Quote</Link>
              </Button>
            </div>
            <div className="space-y-4">
              {quotes?.length ? (
                quotes.map((quote) => (
                  <div
                    className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5"
                    key={quote.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{quote.client_name}</p>
                        <p className="mt-1 text-sm text-[var(--muted)]">
                          {quote.project_address} · {formatDate(quote.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">{formatCurrency(Number(quote.total))}</p>
                        <Button asChild variant="secondary" size="sm">
                          <Link href={`/quotes/${quote.id}`}>Open</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-[var(--line)] bg-[var(--surface)] p-6">
                  <p className="font-semibold">Quotes will appear here once you create them.</p>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                    Start with a room template, tweak a couple values, and save
                    your first branded PDF.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
              Account status
            </p>
            <div className="rounded-[24px] bg-[var(--brand-soft)] p-4">
              {hasPaidAccess(viewer.profile) ? (
                <>
                  <Badge>Paid</Badge>
                  <p className="mt-3 font-semibold capitalize">
                    {viewer.profile?.billingCycle}
                  </p>
                  <p className="mt-2 text-sm text-[var(--brand-strong)]">
                    Unlimited quote creation unlocked.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-[var(--brand-strong)]">Free quotes remaining</p>
                  <p className="mt-2 font-display text-4xl font-bold text-[var(--brand-strong)]">
                    {quotesRemaining(viewer.profile)}
                  </p>
                  <p className="mt-2 text-sm text-[var(--brand-strong)]">
                    {viewer.profile?.freeQuotesUsed ?? 0} used of{" "}
                    {viewer.profile?.freeQuotesLimit ?? 3}
                  </p>
                </>
              )}
            </div>
            {!hasPaidAccess(viewer.profile) ? (
              <div className="rounded-[24px] border border-[var(--line)] p-4 text-sm leading-7 text-[var(--muted)]">
                {canCreateQuote(viewer.profile)
                  ? "You can keep creating quotes until your free limit runs out."
                  : "Your free quotes are used up. Upgrade to keep creating quotes."}
              </div>
            ) : null}
            {!hasPaidAccess(viewer.profile) ? (
              <Button asChild className="w-full">
                <Link href="/billing">Upgrade now</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

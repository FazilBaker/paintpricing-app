import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import {
  canUnlockQuote,
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
  const { data: quotes } = supabase
    ? await supabase
        .from("quotes")
        .select("id, client_name, project_address, total, created_at, pdf_url, version, is_latest")
        .eq("user_id", viewer.user.id)
        .eq("is_latest", true)
        .order("created_at", { ascending: false })
    : { data: null };

  return (
    <main className="container-shell pb-8">
      {/* Account status — shown first on mobile */}
      <Card className="mb-6 sm:hidden">
        <CardContent>
          {hasPaidAccess(viewer.profile) ? (
            <div className="flex items-center justify-between">
              <div>
                <Badge>Pro</Badge>
                <p className="mt-2 text-sm text-[var(--muted)]">Unlimited quotes</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted)]">Free unlocks left</p>
                <p className="mt-1 text-2xl font-bold font-mono text-[var(--brand)]">
                  {quotesRemaining(viewer.profile)}
                </p>
              </div>
              <Button asChild size="sm" variant="accent">
                <Link href="/billing">Upgrade</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Quote list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold sm:text-2xl">Your Quotes</h1>
            <Button asChild size="sm">
              <Link href="/quotes/new">
                <Plus className="h-4 w-4" />
                New Quote
              </Link>
            </Button>
          </div>

          {quotes?.length ? (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <Link
                  href={`/quotes/${quote.id}`}
                  key={quote.id}
                  className="block rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-4 transition hover:border-[var(--line-strong)] hover:shadow-[var(--shadow)] active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold truncate">{quote.client_name || "Untitled"}</p>
                        {(quote.version ?? 1) > 1 && (
                          <Badge className="shrink-0">v{quote.version}</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted)] truncate">
                        {quote.project_address} · {formatDate(quote.created_at)}
                      </p>
                    </div>
                    <p className="shrink-0 font-bold font-mono">
                      {formatCurrency(Number(quote.total))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="font-semibold">No quotes yet</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Tap "New Quote" to create your first branded estimate.
                </p>
                <Button asChild className="mt-4">
                  <Link href="/quotes/new">Create your first quote</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Account status — desktop sidebar */}
        <div className="hidden sm:block space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Account
              </p>
              {hasPaidAccess(viewer.profile) ? (
                <div className="rounded-[var(--radius)] bg-[var(--brand-soft)] p-4">
                  <Badge>Pro</Badge>
                  <p className="mt-2 text-sm font-medium capitalize">
                    {viewer.profile?.billingCycle} plan
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Unlimited quotes
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-[var(--radius)] bg-[var(--brand-soft)] p-4">
                    <p className="text-sm text-[var(--muted)]">Free unlocks remaining</p>
                    <p className="mt-1 text-3xl font-bold font-mono text-[var(--brand)]">
                      {quotesRemaining(viewer.profile)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {viewer.profile?.freeQuotesUsed ?? 0} of{" "}
                      {viewer.profile?.freeQuotesLimit ?? 3} used
                    </p>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {canUnlockQuote(viewer.profile)
                      ? "Create unlimited quotes. Unlock to download or share."
                      : "Free unlocks used up. Upgrade for unlimited access."}
                  </p>
                  <Button asChild className="w-full" variant="accent">
                    <Link href="/billing">Upgrade now</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}

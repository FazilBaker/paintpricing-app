import { redirect } from "next/navigation";

import { activateLifetimeDealAction } from "@/app/actions";
import { BILLING_COPY, FREE_QUOTES_LIMIT, LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { getViewer, hasConfiguredRates, quotesRemaining } from "@/lib/auth";
import { isPaypalConfigured } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";
import { PayPalSubscribeButton } from "@/components/billing/paypal-subscribe-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function BillingPage() {
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect("/login");
  }

  if (!hasConfiguredRates(viewer.profile)) {
    redirect("/onboarding");
  }

  const paypalReady = isPaypalConfigured();
  const supabase = await createSupabaseServerClient();
  const { count: lifetimeSold = 0 } = supabase
    ? await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("billing_cycle", "lifetime")
        .eq("billing_status", "active")
    : { count: 0 };
  const lifetimeRemaining = Math.max(LIFETIME_DEAL_LIMIT - lifetimeSold, 0);

  return (
    <main className="container-shell pb-20">
      <Card className="bg-[linear-gradient(180deg,#183452,#0e2237)] text-white">
        <CardContent className="grid gap-8 p-8 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-5">
            <Badge className="bg-white/12 text-white">Upgrade</Badge>
            <h1 className="font-display text-4xl font-bold">
              Start free, then upgrade when you want unlimited quotes.
            </h1>
            <p className="max-w-2xl text-white/72">
              Every account gets {FREE_QUOTES_LIMIT} free quotes. You have{" "}
              {quotesRemaining(viewer.profile)} free quote
              {quotesRemaining(viewer.profile) === 1 ? "" : "s"} left.
            </p>
            <div className="grid gap-4">
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/64">
                  Free
                </p>
                <p className="mt-2 font-display text-4xl font-bold">$0</p>
                <p className="mt-1 text-sm text-white/72">
                  {FREE_QUOTES_LIMIT} quotes included.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/64">
                  Monthly
                </p>
                <p className="mt-2 font-display text-4xl font-bold">
                  {formatCurrency(BILLING_COPY.monthlyPrice)}
                </p>
                <p className="mt-1 text-sm text-white/72">Billed every month.</p>
              </div>
              <div className="rounded-[24px] border border-[rgba(243,181,98,0.4)] bg-white/10 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent)]">
                  Yearly
                </p>
                <p className="mt-2 font-display text-4xl font-bold">
                  {formatCurrency(BILLING_COPY.yearlyPrice)}
                </p>
                <p className="mt-1 text-sm text-white/72">
                  Save {formatCurrency(BILLING_COPY.yearlySavings)}. Most painters choose yearly.
                </p>
              </div>
              <div className="rounded-[24px] border border-[rgba(243,181,98,0.4)] bg-white/12 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--accent)]">
                  Lifetime Launch Deal
                </p>
                <p className="mt-2 font-display text-4xl font-bold">
                  {formatCurrency(BILLING_COPY.lifetimePrice)}
                </p>
                <p className="mt-1 text-sm text-white/72">
                  First {LIFETIME_DEAL_LIMIT} users only. {lifetimeRemaining} spot
                  {lifetimeRemaining === 1 ? "" : "s"} left.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <Card className="border-white/12 bg-white/96 text-[var(--foreground)]">
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                    Monthly plan
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Start for {formatCurrency(BILLING_COPY.monthlyPrice)}
                  </h2>
                </div>
                {paypalReady ? (
                  <PayPalSubscribeButton
                    cycle="monthly"
                    clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
                    planId={process.env.NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID!}
                  />
                ) : (
                  <p className="rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-strong)]">
                    Add your PayPal client and plan IDs to test checkout.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[rgba(25,101,210,0.15)] bg-white/96 text-[var(--foreground)]">
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                    Yearly plan
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    Best value at {formatCurrency(BILLING_COPY.yearlyPrice)}
                  </h2>
                </div>
                {paypalReady ? (
                  <PayPalSubscribeButton
                    cycle="yearly"
                    clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
                    planId={process.env.NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID!}
                  />
                ) : (
                  <p className="rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-strong)]">
                    Add your PayPal client and plan IDs to test checkout.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-[rgba(243,181,98,0.4)] bg-white/96 text-[var(--foreground)]">
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                    Lifetime deal
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold">
                    One payment of {formatCurrency(BILLING_COPY.lifetimePrice)}
                  </h2>
                  <p className="mt-2 text-sm text-[var(--muted)]">
                    First {LIFETIME_DEAL_LIMIT} users only. This unlocks the tool permanently.
                  </p>
                </div>
                {paypalReady && lifetimeRemaining > 0 ? (
                  <PayPalSubscribeButton
                    cycle="lifetime"
                    clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
                    amount={String(BILLING_COPY.lifetimePrice)}
                  />
                ) : lifetimeRemaining > 0 ? (
                  <form action={activateLifetimeDealAction}>
                    <Button className="w-full" size="lg" type="submit">
                      Mark Lifetime Access Manually
                    </Button>
                  </form>
                ) : (
                  <p className="rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand-strong)]">
                    The lifetime launch deal is sold out.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

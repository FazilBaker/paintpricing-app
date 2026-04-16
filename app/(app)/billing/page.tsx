import { redirect } from "next/navigation";
import { Check, ShieldCheck } from "lucide-react";

import { BILLING_COPY, FREE_QUOTES_LIMIT, LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { getViewer, hasConfiguredRates, quotesRemaining } from "@/lib/auth";
import { isPaypalConfigured } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";
import { LtdCounter } from "@/components/billing/ltd-counter";
import { PayPalSubscribeButton } from "@/components/billing/paypal-subscribe-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  "Unlimited quotes",
  "Branded PDF exports",
  "Interior + exterior templates",
  "Quote versioning",
  "Shareable quote links",
  "Priority support",
];

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
  const lifetimeSoldResult = supabase
    ? await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("billing_cycle", "lifetime")
        .eq("billing_status", "active")
    : { count: 0 };
  const lifetimeSold = lifetimeSoldResult.count ?? 0;
  const lifetimeRemaining = Math.max(LIFETIME_DEAL_LIMIT - lifetimeSold, 0);

  return (
    <main className="container-shell pb-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Choose your plan</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          You have {quotesRemaining(viewer.profile)} free unlock{quotesRemaining(viewer.profile) === 1 ? "" : "s"} remaining.
          Upgrade for unlimited quotes.
        </p>
      </div>

      {/* What's included */}
      <Card className="mb-6">
        <CardContent>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">
            All paid plans include
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 shrink-0 text-[var(--success)]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pricing cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Monthly */}
        <Card>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Monthly
              </p>
              <p className="mt-2 text-3xl font-bold font-mono">
                {formatCurrency(BILLING_COPY.monthlyPrice)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">per month</p>
            </div>
            {paypalReady ? (
              <PayPalSubscribeButton
                cycle="monthly"
                clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
                planId={process.env.NEXT_PUBLIC_PAYPAL_PLAN_MONTHLY!}
                userId={viewer.user!.id}
              />
            ) : (
              <p className="rounded-[var(--radius)] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand)]">
                PayPal not configured yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Yearly — highlighted */}
        <Card className="border-[var(--brand)] border-2 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-[var(--brand)] text-white">Best value</Badge>
          </div>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Yearly
              </p>
              <p className="mt-2 text-3xl font-bold font-mono">
                {formatCurrency(BILLING_COPY.yearlyPrice)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                per year · save {formatCurrency(BILLING_COPY.yearlySavings)}
              </p>
            </div>
            {paypalReady ? (
              <PayPalSubscribeButton
                cycle="yearly"
                clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
                planId={process.env.NEXT_PUBLIC_PAYPAL_PLAN_YEARLY!}
                userId={viewer.user!.id}
              />
            ) : (
              <p className="rounded-[var(--radius)] bg-[var(--brand-soft)] px-4 py-3 text-sm text-[var(--brand)]">
                PayPal not configured yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lifetime */}
        <Card className="border-[var(--accent)] bg-[var(--accent-soft)]">
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-strong)]">
                Lifetime deal
              </p>
              <p className="mt-2 text-3xl font-bold font-mono">
                {formatCurrency(BILLING_COPY.lifetimePrice)}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">one-time payment</p>
            </div>
            <LtdCounter initialRemaining={lifetimeRemaining} total={LIFETIME_DEAL_LIMIT} />
            {paypalReady && lifetimeRemaining > 0 ? (
              <PayPalSubscribeButton
                cycle="lifetime"
                clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
                amount={String(BILLING_COPY.lifetimePrice)}
                userId={viewer.user!.id}
              />
            ) : lifetimeRemaining > 0 ? (
              <p className="rounded-[var(--radius)] bg-[var(--accent-soft)] px-4 py-3 text-sm text-[var(--accent-strong)]">
                PayPal not configured yet.
              </p>
            ) : (
              <p className="rounded-[var(--radius)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                Sold out
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Money-back guarantee */}
      <div className="mt-8 flex items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] px-6 py-4">
        <ShieldCheck className="h-8 w-8 shrink-0 text-[var(--success)]" />
        <div>
          <p className="font-semibold text-sm">14-Day Money-Back Guarantee</p>
          <p className="text-xs text-[var(--muted)]">
            Not happy? Get a full refund within 14 days, no questions asked.
          </p>
        </div>
      </div>
    </main>
  );
}

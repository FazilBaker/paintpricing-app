import { redirect } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";

import { BILLING_COPY, LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { getViewer, hasConfiguredRates, hasPaidAccess, quotesRemaining } from "@/lib/auth";
import { isPaypalConfigured } from "@/lib/env";
import { formatCurrency } from "@/lib/utils";
import { LtdCounter } from "@/components/billing/ltd-counter";
import { PayPalSubscribeButton } from "@/components/billing/paypal-subscribe-button";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const planFeatures = {
  monthly: ["Unlimited quotes", "Branded PDFs", "Shareable links"],
  yearly: ["Everything in Monthly", "2 months free", "Priority support"],
  lifetime: ["Everything forever", "All future updates", "Founding member"],
};

export default async function BillingPage() {
  const viewer = await getViewer();
  if (!viewer.user) redirect("/login");
  if (!hasConfiguredRates(viewer.profile)) redirect("/onboarding");

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
  const remaining = quotesRemaining(viewer.profile);
  const isPaid = hasPaidAccess(viewer.profile);

  return (
    <main className="max-w-[1100px] mx-auto px-7 py-12 pb-20">
      {/* Header */}
      <div className="text-center mb-14">
        <span
          className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
          style={{ background: "var(--amber-50)", color: "var(--amber-600)", letterSpacing: "0.04em" }}
        >
          PRICING
        </span>
        <h1 className="text-[38px] font-bold tracking-tight mb-3" style={{ letterSpacing: "-0.025em", lineHeight: 1.1 }}>
          Quote faster. Close more jobs.
        </h1>
        <p className="text-base text-[var(--muted)] max-w-md mx-auto">
          {isPaid
            ? "You're on an active plan. Upgrade or manage your subscription below."
            : <>You have <strong>{remaining}</strong> free unlock{remaining === 1 ? "" : "s"} remaining. Unlock unlimited quotes with any plan.</>
          }
        </p>
      </div>

      {/* Plan cards */}
      <div className="grid gap-5 sm:grid-cols-3 items-start pt-5">
        {/* Monthly */}
        <div
          className="rounded-[var(--radius-2xl)] border border-[var(--line)] bg-[var(--surface)] p-7"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3.5">Monthly</p>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-mono text-[48px] font-bold" style={{ letterSpacing: "-0.03em" }}>
              ${BILLING_COPY.monthlyPrice}
            </span>
            <span className="text-sm text-[var(--muted)]">/ month</span>
          </div>
          <div className="space-y-2.5 my-6">
            {planFeatures.monthly.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm">
                <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: "var(--navy-50)", color: "var(--navy-700)" }}>
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </div>
                {f}
              </div>
            ))}
          </div>
          {paypalReady ? (
            <PayPalSubscribeButton
              cycle="monthly"
              clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
              planId={process.env.NEXT_PUBLIC_PAYPAL_PLAN_MONTHLY!}
              userId={viewer.user!.id}
            />
          ) : (
            <button
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-[var(--radius)] border border-[var(--line)] text-sm font-semibold text-[var(--ink-2)] bg-[var(--surface)] transition hover:bg-[var(--navy-50)]"
            >
              Start monthly <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Yearly — elevated */}
        <div
          className="rounded-[var(--radius-2xl)] border-2 border-[var(--navy-700)] bg-[var(--surface)] p-7 relative"
          style={{ boxShadow: "var(--shadow-lg)", transform: "translateY(-8px)" }}
        >
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-xs font-bold text-white"
            style={{ background: "var(--navy-700)", letterSpacing: "0.08em" }}
          >
            MOST POPULAR
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3.5">Yearly</p>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-mono text-[48px] font-bold" style={{ letterSpacing: "-0.03em" }}>
              ${BILLING_COPY.yearlyPrice}
            </span>
            <span className="text-sm text-[var(--muted)]">/ year</span>
          </div>
          <p className="text-sm font-semibold mb-3" style={{ color: "var(--ok)" }}>
            Save {formatCurrency(BILLING_COPY.yearlySavings)}
          </p>
          <div className="space-y-2.5 my-6">
            {planFeatures.yearly.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm">
                <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: "var(--navy-50)", color: "var(--navy-700)" }}>
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </div>
                {f}
              </div>
            ))}
          </div>
          {paypalReady ? (
            <PayPalSubscribeButton
              cycle="yearly"
              clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
              planId={process.env.NEXT_PUBLIC_PAYPAL_PLAN_YEARLY!}
              userId={viewer.user!.id}
            />
          ) : (
            <button
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-[var(--radius)] text-sm font-semibold text-white transition"
              style={{ background: "var(--navy-700)" }}
            >
              Start yearly <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lifetime — navy gradient */}
        <div
          className="rounded-[var(--radius-2xl)] p-7 relative overflow-hidden"
          style={{ background: "linear-gradient(180deg, var(--navy-800), var(--navy-900))", color: "white", boxShadow: "var(--shadow-lg)" }}
        >
          <div
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "var(--amber-500)", color: "#3B2300", letterSpacing: "0.08em" }}
          >
            LIMITED · {lifetimeRemaining} LEFT
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-3.5" style={{ color: "var(--amber-400)" }}>Lifetime</p>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="font-mono text-[48px] font-bold" style={{ letterSpacing: "-0.03em" }}>
              ${BILLING_COPY.lifetimePrice}
            </span>
            <span className="text-sm opacity-60">one-time</span>
          </div>
          <div className="mb-3">
            <LtdCounter initialRemaining={lifetimeRemaining} total={LIFETIME_DEAL_LIMIT} />
          </div>
          <div className="space-y-2.5 my-6">
            {planFeatures.lifetime.map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm">
                <div className="w-[18px] h-[18px] rounded-[5px] flex items-center justify-center shrink-0" style={{ background: "rgba(245,166,35,0.25)", color: "var(--amber-400)" }}>
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                </div>
                {f}
              </div>
            ))}
          </div>
          {paypalReady && lifetimeRemaining > 0 ? (
            <PayPalSubscribeButton
              cycle="lifetime"
              clientId={process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!}
              amount={String(BILLING_COPY.lifetimePrice)}
              userId={viewer.user!.id}
            />
          ) : lifetimeRemaining > 0 ? (
            <button
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-[var(--radius)] text-sm font-bold transition"
              style={{ background: "var(--amber-500)", color: "#3B2300" }}
            >
              Claim lifetime <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <p className="rounded-[var(--radius)] px-4 py-3 text-sm font-semibold text-center" style={{ background: "rgba(255,255,255,0.1)" }}>
              Sold out
            </p>
          )}
        </div>
      </div>

      {/* Money-back guarantee */}
      <div
        className="mt-10 flex items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] px-7 py-5"
      >
        <ShieldCheck className="h-9 w-9 shrink-0 text-[var(--success)]" />
        <div>
          <p className="font-semibold text-sm">14-Day Money-Back Guarantee</p>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Not happy? Get a full refund within 14 days, no questions asked.
          </p>
        </div>
      </div>
    </main>
  );
}

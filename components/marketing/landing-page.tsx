import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  Paintbrush2,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";

import {
  BILLING_COPY,
  FREE_QUOTES_LIMIT,
  LIFETIME_DEAL_LIMIT,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  "One-tap room templates for common interior and exterior jobs.",
  "Live gallons, labor hours, markup, tax, and totals as you edit.",
  "Professional quote PDFs with your logo, terms, and room breakdown.",
];

const steps = [
  "Create your account and set your standard rates once.",
  `Use your first ${FREE_QUOTES_LIMIT} quotes for free.`,
  "Upgrade to monthly, yearly, or grab the launch lifetime deal.",
];

export function LandingPage() {
  return (
    <main className="pb-20">
      {/* Hero */}
      <section className="container-shell pt-6">
        <div className="rounded-[var(--radius-2xl)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-md)] sm:p-8">
          <div className="flex flex-col gap-8">
            <header className="flex items-center justify-between gap-4">
              <p className="text-lg font-bold text-[var(--brand)]">
                PaintPricing
              </p>
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </header>

            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <Badge>{FREE_QUOTES_LIMIT} quotes free to start</Badge>
                <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-balance sm:text-5xl">
                  Painting quotes that look pro in under 60 seconds.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  Save your rates once, tap the rooms you are painting, and
                  turn messy spreadsheet math into a clean branded PDF your
                  customers can say yes to.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/signup">Start free</Link>
                  </Button>
                  <Button asChild variant="secondary" size="lg">
                    <Link href="#pricing">See pricing</Link>
                  </Button>
                </div>
                <div className="flex flex-col gap-3 text-sm text-[var(--muted)] sm:flex-row sm:gap-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                    Free to start, upgrade when ready
                  </div>
                  <div className="flex items-center gap-2">
                    <TimerReset className="h-4 w-4 text-[var(--brand)]" />
                    One setup, then quote after quote
                  </div>
                </div>
              </div>

              {/* Sample quote preview */}
              <Card className="overflow-hidden">
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                        Sample quote
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        Fresh Coat Estimate
                      </h2>
                    </div>
                    <div className="rounded-[var(--radius)] bg-[var(--brand-soft)] p-3 text-[var(--brand)]">
                      <FileText className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--background)] p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Johnson Residence</p>
                        <p className="text-sm text-[var(--muted)]">
                          3 rooms, walls + ceilings
                        </p>
                      </div>
                      <p className="text-lg font-bold font-mono">{formatCurrency(1820)}</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Paint needed</span>
                        <span className="font-mono">6.5 gal</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Labor</span>
                        <span className="font-mono">18.2 hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--muted)]">Materials + markup</span>
                        <span className="font-mono">{formatCurrency(455)}</span>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[var(--radius)] bg-[var(--accent-soft)] px-4 py-2.5 text-sm text-[var(--accent-strong)]">
                      Looks branded, not homemade.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-shell mt-8 grid gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature}>
            <CardContent className="flex items-start gap-4">
              <div className="shrink-0 rounded-[var(--radius)] bg-[var(--brand-soft)] p-2.5 text-[var(--brand)]">
                <Paintbrush2 className="h-5 w-5" />
              </div>
              <p className="text-sm leading-6 text-[var(--muted)]">{feature}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* How it works + Pricing */}
      <section className="container-shell mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-5">
            <Badge>How it works</Badge>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Fast enough to use from the driveway.
            </h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div className="flex gap-4" key={step}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1.5 text-sm text-[var(--muted)]">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card id="pricing" className="bg-[var(--brand)] text-white">
          <CardContent className="space-y-5">
            <Badge className="bg-white/15 text-white">Launch pricing</Badge>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Start free, then choose the plan that fits.
            </h2>
            <p className="text-sm text-white/70">
              Every account gets {FREE_QUOTES_LIMIT} free quotes. After that,
              choose monthly, yearly, or the first-{LIFETIME_DEAL_LIMIT} lifetime deal.
            </p>
            <div className="grid gap-3">
              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wider text-white/60">Free</p>
                <p className="mt-1 text-2xl font-bold font-mono">$0</p>
                <p className="mt-1 text-sm text-white/70">
                  {FREE_QUOTES_LIMIT} quotes included.
                </p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wider text-white/60">Monthly</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {formatCurrency(BILLING_COPY.monthlyPrice)}
                </p>
                <p className="mt-1 text-sm text-white/70">Billed every month.</p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-white/15 bg-white/8 p-4">
                <p className="text-xs uppercase tracking-wider text-white/60">Yearly</p>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {formatCurrency(BILLING_COPY.yearlyPrice)}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  Save {formatCurrency(BILLING_COPY.yearlySavings)}.
                </p>
              </div>
              <div className="rounded-[var(--radius-lg)] border border-[var(--accent)]/40 bg-white/12 p-4">
                <div className="flex items-center gap-2 text-[var(--accent)]">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-xs uppercase tracking-wider">Lifetime Deal</p>
                </div>
                <p className="mt-1 text-2xl font-bold font-mono">
                  {formatCurrency(BILLING_COPY.lifetimePrice)}
                </p>
                <p className="mt-1 text-sm text-white/70">
                  First {LIFETIME_DEAL_LIMIT} users only.
                </p>
              </div>
            </div>
            <Button asChild size="lg" variant="accent" className="w-full">
              <Link href="/signup">Create account and start free</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Why painters switch */}
      <section className="container-shell mt-12 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <Badge>Why painters switch</Badge>
            <h2 className="text-2xl font-bold">
              The spreadsheet formula is still there. It is just finally usable.
            </h2>
            <ul className="space-y-3 text-sm text-[var(--muted)]">
              {[
                "Gallons use a conservative 375 sq ft per gallon per coat by default.",
                "Labor hours follow production rates solo painters actually use.",
                "Markup and tax are visible, editable, and easy to trust.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <Badge className="bg-[var(--accent-soft)] text-[var(--accent-strong)]">
              What painters say
            </Badge>
            <div className="space-y-3">
              {[
                '"This replaced the notes app and the spreadsheet I kept breaking."',
                '"Finally something I can use on my phone without pinching and zooming."',
                '"Customers stopped asking why my quotes looked homemade."',
              ].map((quote) => (
                <div
                  className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--background)] p-4 text-sm text-[var(--muted)]"
                  key={quote}
                >
                  {quote}
                </div>
              ))}
              <p className="text-xs text-[var(--muted-foreground)]">
                * Testimonials are from beta testers.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

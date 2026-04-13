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
  "One-tap room templates for common interior repaint jobs.",
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
      <section className="container-shell pt-6">
        <div className="panel rounded-[32px] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(220,232,251,0.84))] px-5 py-6 sm:px-8">
          <div className="flex flex-col gap-8">
            <header className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-xl font-bold tracking-tight">
                  PaintPricing.com
                </p>
                <p className="text-sm text-[var(--muted)]">
                  Interior repaint quotes without the spreadsheet mess.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </div>
            </header>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <Badge>{FREE_QUOTES_LIMIT} quotes free to start</Badge>
                <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-balance sm:text-6xl">
                  Interior repaint quotes that look pro in under 60 seconds.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[var(--muted)]">
                  Save your rates once, tap the rooms you are painting, and
                  turn messy Excel math into a clean branded quote PDF your
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
                <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[var(--success)]" />
                    Start free, then upgrade only if the tool earns its place
                  </div>
                  <div className="flex items-center gap-2">
                    <TimerReset className="h-4 w-4 text-[var(--brand)]" />
                    One setup screen, then quote after quote
                  </div>
                </div>
              </div>

              <Card className="overflow-hidden">
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                        Sample quote preview
                      </p>
                      <h2 className="mt-2 font-display text-2xl font-bold">
                        Fresh Coat Estimate
                      </h2>
                    </div>
                    <div className="rounded-2xl bg-[var(--brand-soft)] p-3 text-[var(--brand-strong)]">
                      <FileText className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <div>
                        <p className="font-semibold">Johnson Residence</p>
                        <p className="text-sm text-[var(--muted)]">
                          3 rooms, walls + ceilings
                        </p>
                      </div>
                      <p className="text-lg font-bold">{formatCurrency(1820)}</p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span>Paint needed</span>
                        <span>6.5 gal</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Labor</span>
                        <span>18.2 hrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Materials + markup</span>
                        <span>{formatCurrency(455)}</span>
                      </div>
                      <div className="mt-4 rounded-2xl bg-[var(--brand-soft)] px-4 py-3 text-[var(--brand-strong)]">
                        Quote looks branded, not homemade.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="container-shell mt-10 grid gap-4 md:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature}>
            <CardContent className="flex h-full items-start gap-4">
              <div className="rounded-2xl bg-[var(--brand-soft)] p-3 text-[var(--brand-strong)]">
                <Paintbrush2 className="h-5 w-5" />
              </div>
              <p className="text-sm leading-7 text-[var(--muted)]">{feature}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="container-shell mt-16 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardContent className="space-y-5">
            <Badge>How it works</Badge>
            <h2 className="font-display text-3xl font-bold">
              Fast enough to use from the driveway.
            </h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div className="flex gap-4" key={step}>
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <p className="pt-2 text-[var(--muted)]">{step}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card id="pricing" className="bg-[linear-gradient(180deg,#183452,#0e2237)] text-white">
          <CardContent className="space-y-5">
            <Badge className="bg-white/12 text-white">Launch pricing</Badge>
            <div>
              <h2 className="font-display text-3xl font-bold">
                Start free, then choose the plan that fits how you work.
              </h2>
              <p className="mt-3 max-w-xl text-white/72">
                Every account gets {FREE_QUOTES_LIMIT} free quotes. After that,
                choose monthly, yearly, or the first-{LIFETIME_DEAL_LIMIT} lifetime launch deal.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/64">
                  Free
                </p>
                <p className="mt-3 font-display text-4xl font-bold">$0</p>
                <p className="mt-2 text-white/72">
                  {FREE_QUOTES_LIMIT} quotes included.
                </p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/64">
                  Monthly
                </p>
                <p className="mt-3 font-display text-4xl font-bold">
                  {formatCurrency(BILLING_COPY.monthlyPrice)}
                </p>
                <p className="mt-2 text-white/72">Billed every month.</p>
              </div>
              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5">
                <p className="text-sm uppercase tracking-[0.18em] text-white/64">
                  Yearly
                </p>
                <p className="mt-3 font-display text-4xl font-bold">
                  {formatCurrency(BILLING_COPY.yearlyPrice)}
                </p>
                <p className="mt-2 text-white/72">
                  Save {formatCurrency(BILLING_COPY.yearlySavings)}.
                </p>
              </div>
            </div>
            <div className="rounded-[24px] border border-[rgba(243,181,98,0.4)] bg-white/12 p-5">
              <div className="flex items-center gap-2 text-[var(--accent)]">
                <Sparkles className="h-4 w-4" />
                <p className="text-sm uppercase tracking-[0.18em]">
                  Lifetime Launch Deal
                </p>
              </div>
              <p className="mt-3 font-display text-4xl font-bold">
                {formatCurrency(BILLING_COPY.lifetimePrice)}
              </p>
              <p className="mt-2 text-white/72">
                First {LIFETIME_DEAL_LIMIT} users only.
              </p>
            </div>
            <Button asChild size="lg">
              <Link href="/signup">Create account and start free</Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="container-shell mt-16 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-4">
            <Badge>Why painters switch</Badge>
            <h2 className="font-display text-3xl font-bold">
              The spreadsheet formula is still there. It is just finally usable.
            </h2>
            <ul className="space-y-3 text-sm text-[var(--muted)]">
              {[
                "Gallons use a conservative 375 sq ft per gallon per coat by default.",
                "Labor hours follow production rates solo painters actually use.",
                "Markup and tax are visible, editable, and easy to trust.",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--success)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <Badge>Testimonials placeholder</Badge>
            <div className="space-y-4">
              {[
                '"This replaced the notes app and the spreadsheet I kept breaking."',
                '"Finally something I can use on my phone without pinching and zooming."',
                '"Customers stopped asking why my quotes looked homemade."',
              ].map((quote) => (
                <div
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-4 text-sm leading-7 text-[var(--muted)]"
                  key={quote}
                >
                  {quote}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

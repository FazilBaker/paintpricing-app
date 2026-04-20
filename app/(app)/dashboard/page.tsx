import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Plus } from "lucide-react";

import {
  getViewer,
  hasConfiguredRates,
  hasPaidAccess,
  quotesRemaining,
} from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function quoteStatus(quote: { is_unlocked?: boolean; pdf_url?: string | null }) {
  if (quote.is_unlocked) return "sent";
  return "locked";
}

const statusLabel = { sent: "Sent", locked: "Locked", draft: "Draft" } as const;

export default async function DashboardPage() {
  const viewer = await getViewer();

  if (!viewer.user) redirect("/login");
  if (!hasConfiguredRates(viewer.profile)) redirect("/onboarding");

  const supabase = await createSupabaseServerClient();
  const { data: quotes } = supabase
    ? await supabase
        .from("quotes")
        .select("id, client_name, project_address, total, created_at, pdf_url, version, is_latest, is_unlocked")
        .eq("user_id", viewer.user.id)
        .eq("is_latest", true)
        .order("created_at", { ascending: false })
    : { data: null };

  const isPaid = hasPaidAccess(viewer.profile);
  const remaining = quotesRemaining(viewer.profile);

  return (
    <main className="max-w-[1240px] mx-auto px-7 pt-8 pb-20">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight" style={{ letterSpacing: "-0.02em" }}>Your quotes</h1>
          <p className="text-sm text-[var(--muted)] mt-1">{quotes?.length ?? 0} total · tap a quote to open</p>
        </div>
        <Button asChild>
          <Link href="/quotes/new">
            <Plus className="h-4 w-4" />
            New quote
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        {/* Quote list */}
        <div className="space-y-2">
          {quotes?.length ? (
            quotes.map((quote) => {
              const status = quoteStatus(quote);
              return (
                <Link
                  key={quote.id}
                  href={`/quotes/${quote.id}`}
                  className="grid items-center gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] transition-all hover:border-[var(--navy-500)] hover:shadow-[var(--shadow)] active:scale-[0.99] text-left"
                  style={{ gridTemplateColumns: "auto minmax(0,1fr) auto auto auto" }}
                >
                  <span className={`pp-dot pp-dot-${status}`} />
                  <div className="min-w-0">
                    <p className="font-semibold text-[15px] truncate">{quote.client_name || "Untitled quote"}</p>
                    <p className="text-sm text-[var(--muted)] mt-0.5 truncate">
                      {quote.project_address} · {formatDate(quote.created_at)}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--muted)] uppercase tracking-wider font-semibold shrink-0 hidden sm:block">
                    {statusLabel[status]}
                  </span>
                  <span className="font-mono text-[17px] font-semibold shrink-0" style={{ letterSpacing: "-0.01em", minWidth: 80, textAlign: "right" }}>
                    {formatCurrency(Number(quote.total))}
                  </span>
                  <ChevronRight className="h-4 w-4 text-[var(--muted-2)] shrink-0" />
                </Link>
              );
            })
          ) : (
            /* Empty state */
            <div
              className="relative rounded-[var(--radius-2xl)] border border-[var(--line)] bg-[var(--surface)] p-10 overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 bottom-0 w-[45%]"
                style={{
                  background: "linear-gradient(135deg, var(--navy-700), var(--navy-800))",
                  clipPath: "polygon(20% 0, 100% 0, 100% 100%, 0 100%)",
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.04) 10px 11px)" }}
                />
                <div className="absolute top-8 right-8 flex flex-col gap-2">
                  {["var(--amber-500)", "var(--amber-400)", "#C0D4E6", "#8FAAC7", "#4B6A8B"].map((c, i) => (
                    <div
                      key={i}
                      style={{ width: 100, height: 16, background: c, borderRadius: 3, transform: `translateX(${i * -6}px)`, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
                    />
                  ))}
                </div>
              </div>
              <div className="relative max-w-sm">
                <span
                  className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-4"
                  style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}
                >
                  GET STARTED
                </span>
                <h2 className="text-3xl font-bold mb-3" style={{ letterSpacing: "-0.02em", lineHeight: 1.1 }}>
                  Your first quote in 60 seconds.
                </h2>
                <p className="text-base text-[var(--muted)] leading-relaxed mb-6">
                  Tap a room, enter a few numbers, hit save. We&apos;ll turn it into a branded PDF you can send from the job site.
                </p>
                <Button asChild size="lg" style={{ background: "var(--amber-500)", color: "#3B2300", fontWeight: 600 }}>
                  <Link href="/quotes/new">
                    <Plus className="h-4 w-4" /> Build your first quote
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar — account card */}
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <div
              className="rounded-[var(--radius-lg)] p-5 relative overflow-hidden"
              style={{ background: "var(--navy-700)", color: "white", border: "none" }}
            >
              <div
                className="absolute top-[-20px] right-[-20px] w-28 h-28 rounded-full opacity-15"
                style={{ background: "var(--amber-500)" }}
              />
              <div className="relative">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--amber-400)", letterSpacing: "0.08em" }}>
                  {isPaid ? "PAID PLAN" : "FREE PLAN"}
                </p>
                {isPaid ? (
                  <>
                    <p className="text-[15px] font-semibold mt-2.5">Unlimited quotes</p>
                    <p className="text-sm mt-1 opacity-70 capitalize">{viewer.profile?.billingCycle} plan · active</p>
                  </>
                ) : (
                  <>
                    <p className="text-[15px] font-semibold mt-2.5">{remaining} free unlock{remaining === 1 ? "" : "s"}</p>
                    <p className="text-sm mt-1 opacity-70">Upgrade for unlimited quotes</p>
                    <Button
                      asChild
                      className="mt-4 text-sm font-semibold"
                      style={{ background: "var(--amber-500)", color: "#3B2300" }}
                      size="sm"
                    >
                      <Link href="/billing">See plans →</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile account status bar */}
      {!isPaid && (
        <div className="lg:hidden fixed bottom-20 left-4 right-4 z-40">
          <div
            className="flex items-center justify-between rounded-[var(--radius-lg)] px-4 py-3"
            style={{ background: "var(--navy-900)", color: "white", boxShadow: "var(--shadow-lg)" }}
          >
            <span className="text-sm">
              <span style={{ color: "var(--amber-400)", fontWeight: 600 }}>{remaining}</span>{" "}
              free unlock{remaining === 1 ? "" : "s"} left
            </span>
            <Link
              href="/billing"
              className="text-xs font-semibold px-3 py-1.5 rounded-md"
              style={{ background: "var(--amber-500)", color: "#3B2300" }}
            >
              Upgrade
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

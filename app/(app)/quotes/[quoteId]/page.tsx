import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ChevronRight, Download, Lock, Pencil, Unlock } from "lucide-react";

import { getViewer, hasConfiguredRates } from "@/lib/auth";
import { deleteQuoteAction, unlockQuoteAction } from "@/app/actions";
import type { QuoteRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteQuoteButton } from "@/components/quotes/delete-quote-button";
import { ShareQuoteButton } from "@/components/quotes/share-quote-button";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const viewer = await getViewer();

  if (!viewer.user) {
    redirect("/login");
  }

  if (!hasConfiguredRates(viewer.profile)) {
    redirect("/onboarding");
  }

  const supabase = await (await import("@/lib/supabase/server")).createSupabaseServerClient();
  if (!supabase) {
    redirect("/dashboard");
  }

  const { data } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", viewer.user.id)
    .single();

  if (!data) {
    redirect("/dashboard");
  }

  const quote: QuoteRecord = {
    id: data.id,
    clientName: data.client_name,
    projectAddress: data.project_address,
    total: Number(data.total),
    createdAt: data.created_at,
    pdfUrl: data.pdf_url,
    quoteData: data.quote_data,
    version: data.version ?? 1,
    parentQuoteId: data.parent_quote_id ?? null,
    isLatest: data.is_latest ?? true,
    isUnlocked: data.is_unlocked ?? false,
  };

  const isUnlocked = quote.isUnlocked;
  const shareToken: string | null = data.share_token ?? null;
  const shareUrl = shareToken
    ? `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.paintpricing.com"}/q/${shareToken}`
    : null;

  const isPaid = viewer.profile?.billingStatus === "active";
  const freeCreditsLeft = viewer.profile
    ? viewer.profile.freeQuotesLimit - viewer.profile.freeQuotesUsed
    : 0;

  // Fetch version history if this quote has versions
  const rootId = quote.parentQuoteId ?? quote.id;
  const { data: versionRows } = await supabase
    .from("quotes")
    .select("id, version, created_at, is_latest, total")
    .or(`id.eq.${rootId},parent_quote_id.eq.${rootId}`)
    .eq("user_id", viewer.user.id)
    .order("version", { ascending: true });

  const versions = versionRows ?? [];
  const hasVersions = versions.length > 1;

  const allItems = quote.quoteData.items ?? [];
  const legacyRooms = !allItems.length ? (quote.quoteData.summary.rooms ?? []) : [];

  return (
    <main className="max-w-[1240px] mx-auto px-7 py-6 pb-20">
      {/* Breadcrumb + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
        <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <Link href="/dashboard" className="hover:text-[var(--ink)] transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5 text-[var(--muted-2)]" />
          <span className="text-[var(--ink)] font-medium truncate">
            {quote.clientName || "Untitled quote"}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {quote.isLatest && (
            <Button asChild variant="secondary" size="sm">
              <Link href={`/quotes/new?edit=${quote.id}`}>
                <Pencil className="h-4 w-4" /> Edit
              </Link>
            </Button>
          )}
          {isUnlocked && shareUrl && (
            <ShareQuoteButton
              shareUrl={shareUrl}
              clientEmail={quote.quoteData.client.customerEmail}
              clientName={quote.quoteData.client.customerName}
              quoteTitle={quote.quoteData.client.quoteTitle}
            />
          )}
          {isUnlocked && (
            <Button asChild size="sm">
              <Link href={`/api/quotes/${quote.id}/pdf`} target="_blank">
                <Download className="h-4 w-4" /> Download PDF
              </Link>
            </Button>
          )}
          <DeleteQuoteButton quoteId={quote.id} />
        </div>
      </div>

      {/* Header card */}
      <div
        className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-6 mb-4"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              {isUnlocked ? (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#D1FAE5", color: "var(--ok)" }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: "var(--ok)", boxShadow: "0 0 0 3px #D1FAE5" }} /> Sent
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--amber-50)", color: "var(--amber-600)" }}>
                  <Lock className="h-3 w-3" /> Locked
                </span>
              )}
              <span className="font-mono text-xs text-[var(--muted)]">
                {formatDate(quote.createdAt)}
              </span>
            </div>
            <h1 className="text-[28px] font-bold tracking-tight mb-2.5" style={{ letterSpacing: "-0.02em" }}>
              {quote.clientName || "Untitled quote"}
            </h1>
            {quote.projectAddress && (
              <p className="text-sm text-[var(--muted)]">{quote.projectAddress}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1">Grand total</p>
            <p className="font-mono font-bold" style={{ fontSize: 40, letterSpacing: "-0.025em", lineHeight: 1.1 }}>
              {formatCurrency(quote.total)}
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">
              {(allItems.length || legacyRooms.length)} item{(allItems.length || legacyRooms.length) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* Line items */}
        <div>
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-2)]">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Line items</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--navy-50)", color: "var(--navy-700)" }}>
                {allItems.length || legacyRooms.length} total
              </span>
            </div>
            {allItems.map((item, i) => {
              const isExt = item.type === "exterior";
              return (
                <div
                  key={item.id}
                  className="grid items-center gap-3.5 px-5 py-3.5"
                  style={{
                    gridTemplateColumns: "auto 1fr auto auto",
                    borderBottom: i < allItems.length - 1 ? "1px solid var(--line-2)" : "none",
                  }}
                >
                  <span
                    className="font-mono text-xs font-bold flex items-center justify-center w-7 h-7 rounded-[7px]"
                    style={{ background: isExt ? "var(--amber-50)" : "var(--navy-50)", color: isExt ? "var(--amber-600)" : "var(--navy-700)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[15px] truncate">{item.name}</p>
                    {item.scopeDescription && (
                      <p className="text-sm text-[var(--muted)] mt-0.5 line-clamp-1">{item.scopeDescription}</p>
                    )}
                  </div>
                  <span className="text-xs text-[var(--muted)] capitalize hidden sm:block">{item.type}</span>
                  <span className="font-mono text-[17px] font-semibold" style={{ minWidth: 80, textAlign: "right" }}>
                    {formatCurrency(item.price)}
                  </span>
                </div>
              );
            })}
            {legacyRooms.map((room, i) => (
              <div
                key={room.id}
                className="grid items-center gap-3.5 px-5 py-3.5"
                style={{
                  gridTemplateColumns: "auto 1fr auto auto",
                  borderBottom: i < legacyRooms.length - 1 ? "1px solid var(--line-2)" : "none",
                }}
              >
                <span className="font-mono text-xs font-bold flex items-center justify-center w-7 h-7 rounded-[7px]" style={{ background: "var(--navy-50)", color: "var(--navy-700)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="font-semibold text-[15px]">{room.name}</p>
                  <p className="text-sm text-[var(--muted)] mt-0.5">
                    {room.paintableWallArea.toFixed(0)} sq ft · 2 coats
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)] capitalize hidden sm:block">{room.scope}</span>
                <span className="font-mono text-[17px] font-semibold" style={{ minWidth: 80, textAlign: "right" }}>
                  {formatCurrency(room.roomSubtotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          <div className="sticky top-24 space-y-4">
            {/* Unlock / unlocked card */}
            {!isUnlocked ? (
              <div
                className="rounded-[var(--radius-lg)] overflow-hidden relative"
                style={{ background: "linear-gradient(180deg, var(--navy-800), var(--navy-900))", color: "white", border: "none" }}
              >
                {/* Decorative glow */}
                <div className="absolute top-[-30px] right-[-30px] w-40 h-40 rounded-full opacity-12" style={{ background: "var(--amber-500)", filter: "blur(20px)" }} />
                <div className="p-6 relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "var(--amber-500)", color: "#3B2300" }}>
                      <Lock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--amber-400)" }}>Ready to send</p>
                      <p className="text-[15px] font-semibold">Unlock this quote</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {isPaid
                      ? "Tap unlock to enable PDF download and sharing."
                      : freeCreditsLeft > 0
                        ? `Unlocking uses 1 credit. You have ${freeCreditsLeft} free credit${freeCreditsLeft > 1 ? "s" : ""} remaining.`
                        : "You've used all your free credits. Upgrade to unlock unlimited quotes."}
                  </p>
                  {[
                    "Branded PDF with your logo",
                    "Shareable client link",
                    "No PaintPricing watermark",
                  ].map((t) => (
                    <div key={t} className="flex items-center gap-2 text-sm mb-2">
                      <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ background: "rgba(245,166,35,0.2)", color: "var(--amber-400)" }}>
                        <Check className="h-2.5 w-2.5" />
                      </div>
                      {t}
                    </div>
                  ))}
                  <div className="mt-5">
                    {(isPaid || freeCreditsLeft > 0) ? (
                      <form action={unlockQuoteAction}>
                        <input type="hidden" name="quoteId" value={quote.id} />
                        <Button
                          type="submit"
                          size="lg"
                          className="w-full justify-center"
                          style={{ background: "var(--amber-500)", color: "#3B2300", fontWeight: 600 }}
                        >
                          <Unlock className="h-4 w-4" />
                          {isPaid ? "Unlock & send" : `Unlock (1 credit)`}
                        </Button>
                      </form>
                    ) : (
                      <Button asChild size="lg" className="w-full justify-center" style={{ background: "var(--amber-500)", color: "#3B2300", fontWeight: 600 }}>
                        <Link href="/billing">Upgrade for unlimited</Link>
                      </Button>
                    )}
                  </div>
                  {/* Blurred PDF preview */}
                  <div className="mt-4 rounded-[10px] overflow-hidden h-32 bg-white relative">
                    <div className="p-3.5" style={{ filter: "blur(4px)", opacity: 0.7 }}>
                      <div className="w-16 h-2.5 rounded" style={{ background: "var(--navy-700)" }} />
                      <div className="w-32 h-3.5 rounded mt-2" style={{ background: "var(--ink)" }} />
                      <div className="w-full h-1.5 rounded mt-3" style={{ background: "var(--line)" }} />
                      <div className="w-[90%] h-1.5 rounded mt-1.5" style={{ background: "var(--line)" }} />
                      <div className="w-[70%] h-1.5 rounded mt-1.5" style={{ background: "var(--line)" }} />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 text-white" style={{ background: "rgba(14,35,64,0.85)", backdropFilter: "blur(8px)" }}>
                        Preview PDF
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[var(--radius-lg)] border p-5 space-y-3" style={{ borderColor: "var(--ok)", boxShadow: "0 0 0 3px #D1FAE5" }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: "#D1FAE5", color: "var(--ok)" }}>
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <div>
                    <p className="text-[15px] font-semibold">Unlocked</p>
                    <p className="text-sm text-[var(--muted)]">Ready to share</p>
                  </div>
                </div>
                <Button asChild size="lg" className="w-full justify-center">
                  <Link href={`/api/quotes/${quote.id}/pdf`} target="_blank">
                    <Download className="h-4 w-4" /> Download PDF
                  </Link>
                </Button>
                {shareUrl && (
                  <ShareQuoteButton
                    shareUrl={shareUrl}
                    clientEmail={quote.quoteData.client.customerEmail}
                    clientName={quote.quoteData.client.customerName}
                    quoteTitle={quote.quoteData.client.quoteTitle}
                  />
                )}
              </div>
            )}

            {/* Totals */}
            <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)] p-5" style={{ boxShadow: "var(--shadow-sm)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-3">Totals</p>
              <div className="space-y-2 text-sm">
                {(quote.quoteData.summary.discount ?? 0) > 0 && (
                  <div className="flex justify-between text-[var(--success)]">
                    <span>Discount</span>
                    <span className="font-mono">-{formatCurrency(quote.quoteData.summary.discount ?? 0)}</span>
                  </div>
                )}
                {quote.quoteData.summary.taxTotal > 0 && (
                  <div className="flex justify-between">
                    <span className="text-[var(--muted)]">Tax</span>
                    <span className="font-mono">{formatCurrency(quote.quoteData.summary.taxTotal)}</span>
                  </div>
                )}
                <div className="h-px my-1" style={{ background: "var(--line)" }} />
                <div className="flex items-baseline justify-between">
                  <span className="text-[14px] font-semibold">Grand total</span>
                  <span className="font-mono font-bold" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>
                    {formatCurrency(quote.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Version history */}
            {hasVersions && (
              <Card>
                <CardContent className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Version history</p>
                  <div className="space-y-1">
                    {versions.map((v) => (
                      <Link
                        key={v.id}
                        href={`/quotes/${v.id}`}
                        className={`flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm transition ${
                          v.id === quote.id
                            ? "bg-[var(--brand-soft)] border border-[var(--brand)]/20 font-semibold"
                            : "hover:bg-[var(--navy-50)] border border-transparent"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          v{v.version ?? 1}
                          {v.is_latest && <span className="text-xs text-[var(--success)]">Current</span>}
                        </span>
                        <span className="font-mono text-xs">{formatCurrency(Number(v.total))}</span>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Download, Lock, Pencil, Unlock } from "lucide-react";

import { getViewer, hasConfiguredRates } from "@/lib/auth";
import { unlockQuoteAction } from "@/app/actions";
import type { QuoteRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  return (
    <main className="container-shell py-6 pb-20">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold sm:text-2xl">
              {quote.clientName || "Untitled quote"}
            </h1>
            {quote.version > 1 && (
              <Badge>v{quote.version}</Badge>
            )}
            {!quote.isLatest && (
              <span className="text-xs text-[var(--muted)] bg-[var(--surface)] border border-[var(--line)] rounded px-2 py-0.5">
                Superseded
              </span>
            )}
            {!isUnlocked && (
              <span className="flex items-center gap-1 text-xs text-[var(--accent-strong)] bg-[var(--accent-soft)] rounded px-2 py-0.5">
                <Lock className="h-3 w-3" />
                Locked
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {quote.projectAddress} · {formatDate(quote.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Share + Download only visible when unlocked */}
          {isUnlocked && shareUrl && (
            <ShareQuoteButton
              shareUrl={shareUrl}
              clientEmail={quote.quoteData.client.customerEmail}
              clientName={quote.quoteData.client.customerName}
              quoteTitle={quote.quoteData.client.quoteTitle}
            />
          )}
          {quote.isLatest && (
            <Button asChild variant="secondary">
              <Link href={`/quotes/new?edit=${quote.id}`}>
                <Pencil className="h-4 w-4" />
                Edit Quote
              </Link>
            </Button>
          )}
          {isUnlocked && (
            <Button asChild>
              <Link href={`/api/quotes/${quote.id}/pdf`} target="_blank">
                <Download className="h-4 w-4" />
                Download PDF
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Unlock prompt for locked quotes */}
      {!isUnlocked && (
        <Card className="mb-6 border-[var(--accent)]">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <Lock className="h-6 w-6 text-[var(--accent-strong)]" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Unlock this quote</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {isPaid
                  ? "Tap unlock to enable PDF download and sharing."
                  : freeCreditsLeft > 0
                    ? `Unlocking uses 1 credit. You have ${freeCreditsLeft} free credit${freeCreditsLeft > 1 ? "s" : ""} remaining.`
                    : "You've used all your free credits. Upgrade to unlock unlimited quotes."}
              </p>
            </div>
            {(isPaid || freeCreditsLeft > 0) ? (
              <form action={unlockQuoteAction}>
                <input type="hidden" name="quoteId" value={quote.id} />
                <Button type="submit" variant="accent" size="lg" className="shrink-0">
                  <Unlock className="h-4 w-4" />
                  {isPaid ? "Unlock" : `Unlock (1 credit)`}
                </Button>
              </form>
            ) : (
              <Button asChild variant="accent" size="lg" className="shrink-0">
                <Link href="/billing">Upgrade</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Items breakdown */}
        <div className="space-y-3">
          {/* New unified items */}
          {(quote.quoteData.items ?? []).map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{item.name}</p>
                    <span className="text-xs text-[var(--muted)] capitalize shrink-0">{item.type}</span>
                  </div>
                  {item.scopeDescription && (
                    <p className="mt-1 text-sm text-[var(--muted)] line-clamp-2">
                      {item.scopeDescription}
                    </p>
                  )}
                  {item.paintColor && (
                    <p className="mt-0.5 text-xs text-[var(--accent-strong)]">
                      {item.paintColor}
                    </p>
                  )}
                </div>
                <p className="shrink-0 font-bold font-mono">
                  {formatCurrency(item.price)}
                </p>
              </CardContent>
            </Card>
          ))}

          {/* Legacy room breakdown for old quotes */}
          {(!quote.quoteData.items || quote.quoteData.items.length === 0) &&
            quote.quoteData.summary.rooms.map((room) => (
              <Card key={room.id}>
                <CardContent className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{room.name}</p>
                      <span className="text-xs text-[var(--muted)] capitalize">{room.scope}</span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {room.paintableWallArea.toFixed(0)} sq ft walls ·{" "}
                      {room.ceilingArea.toFixed(0)} sq ft ceiling
                    </p>
                  </div>
                  <p className="shrink-0 font-bold font-mono">
                    {formatCurrency(room.roomSubtotal)}
                  </p>
                </CardContent>
              </Card>
            ))}
        </div>

        {/* Totals sidebar + version history */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Summary
              </p>

              {(quote.quoteData.summary.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-[var(--success)]">
                  <span>Discount</span>
                  <span className="font-mono">-{formatCurrency(quote.quoteData.summary.discount ?? 0)}</span>
                </div>
              )}

              {quote.quoteData.summary.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Tax</span>
                  <span className="font-mono">{formatCurrency(quote.quoteData.summary.taxTotal)}</span>
                </div>
              )}

              <div className="rounded-[var(--radius)] bg-[var(--brand-soft)] p-4">
                <p className="text-sm text-[var(--brand)]">Grand total</p>
                <p className="mt-1 text-3xl font-bold font-mono text-[var(--brand)]">
                  {formatCurrency(quote.total)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Version history */}
          {hasVersions && (
            <Card>
              <CardContent className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Version history
                </p>
                <div className="space-y-2">
                  {versions.map((v) => (
                    <Link
                      key={v.id}
                      href={`/quotes/${v.id}`}
                      className={`flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2 text-sm transition ${
                        v.id === quote.id
                          ? "bg-[var(--brand-soft)] border border-[var(--brand)]/20 font-semibold"
                          : "hover:bg-[var(--surface)] border border-transparent"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        v{v.version ?? 1}
                        {v.is_latest && (
                          <span className="text-xs text-[var(--success)]">Current</span>
                        )}
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
    </main>
  );
}

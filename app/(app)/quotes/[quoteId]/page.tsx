import Link from "next/link";
import { redirect } from "next/navigation";

import { getViewer, hasConfiguredRates, hasPaidAccess } from "@/lib/auth";
import type { QuoteRecord } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  if (!hasPaidAccess(viewer.profile)) {
    redirect("/billing");
  }

  const supabase = await (await import("@/lib/supabase/server")).createSupabaseServerClient();
  const { data } = await supabase!
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("user_id", viewer.user.id)
    .single();

  if (!data) {
    redirect("/dashboard");
  }

  const quote = {
    id: data.id,
    clientName: data.client_name,
    projectAddress: data.project_address,
    total: Number(data.total),
    createdAt: data.created_at,
    pdfUrl: data.pdf_url,
    quoteData: data.quote_data,
  } as QuoteRecord;

  return (
    <main className="container-shell pb-20">
      <Card>
        <CardContent className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                Saved quote
              </p>
              <h1 className="mt-2 font-display text-4xl font-bold">
                {quote.clientName || "Untitled quote"}
              </h1>
              <p className="mt-2 text-[var(--muted)]">
                {quote.projectAddress} · Created {formatDate(quote.createdAt)}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href="/dashboard">Back to dashboard</Link>
              </Button>
              <Button asChild>
                <Link href={quote.pdfUrl ?? `/api/quotes/${quote.id}/pdf`} target="_blank">
                  Open PDF
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
            <div className="space-y-4">
              {quote.quoteData.summary.rooms.map((room) => (
                <div
                  className="rounded-[24px] border border-[var(--line)] bg-[var(--surface)] p-5"
                  key={room.id}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h2 className="font-semibold">{room.name}</h2>
                    <p>{formatCurrency(room.roomSubtotal)}</p>
                  </div>
                  <p className="mt-3 text-sm text-[var(--muted)]">
                    Paintable walls: {room.paintableWallArea.toFixed(0)} sq ft ·
                    Ceiling: {room.ceilingArea.toFixed(0)} sq ft · Gallons:{" "}
                    {(room.wallGallons + room.trimGallons).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            <Card>
              <CardContent className="space-y-4">
                <p className="text-sm uppercase tracking-[0.18em] text-[var(--muted)]">
                  Totals
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Labor</span>
                    <span>{formatCurrency(quote.quoteData.summary.laborTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Materials</span>
                    <span>{formatCurrency(quote.quoteData.summary.materialsTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span>{formatCurrency(quote.quoteData.summary.taxTotal)}</span>
                  </div>
                </div>
                <div className="rounded-[24px] bg-[var(--brand-soft)] p-4">
                  <p className="text-sm text-[var(--brand-strong)]">Grand total</p>
                  <p className="mt-2 font-display text-4xl font-bold text-[var(--brand-strong)]">
                    {formatCurrency(quote.total)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

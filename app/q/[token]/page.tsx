import { notFound } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { QuoteDraftPayload } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

export const revalidate = 0;

export default async function SharedQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    notFound();
  }

  const { data } = await supabase
    .from("quotes")
    .select("quote_data, created_at, is_unlocked")
    .eq("share_token", token)
    .single();

  if (!data) {
    notFound();
  }

  const isUnlocked: boolean = data.is_unlocked ?? false;
  const qd: QuoteDraftPayload = data.quote_data as QuoteDraftPayload;
  const createdAt = data.created_at as string;
  const branding = qd.branding;
  const client = qd.client;
  const summary = qd.summary;
  const items = qd.items ?? [];
  const legacyRooms = summary.rooms ?? [];
  const hasItems = items.length > 0;

  // Calculate valid-until date
  const validDays = client.quoteValidDays ?? 30;
  const createdDate = new Date(createdAt);
  const validUntilDate = new Date(createdDate);
  validUntilDate.setDate(validUntilDate.getDate() + validDays);
  const validUntil = validUntilDate.toISOString();

  return (
    <main className="relative min-h-screen bg-[var(--background)]">
      {/* Watermark overlay for locked (free tier) quotes */}
      {!isUnlocked && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
          <p
            className="select-none whitespace-nowrap text-[120px] font-black uppercase tracking-widest opacity-[0.06]"
            style={{
              color: "var(--foreground)",
              transform: "rotate(-35deg)",
            }}
          >
            SAMPLE
          </p>
        </div>
      )}

      {/* Brand color bar */}
      <div className="h-2 w-full bg-[var(--brand)]" />

      <div className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
        {/* Business header */}
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            {branding.logoUrl && (
              <img
                src={branding.logoUrl}
                alt={branding.businessName}
                className="mb-3 h-12 w-auto object-contain"
              />
            )}
            <h2 className="text-lg font-bold text-[var(--foreground)]">
              {branding.businessName}
            </h2>
            <div className="mt-1 space-y-0.5 text-sm text-[var(--muted)]">
              {branding.phone && <p>{branding.phone}</p>}
              {branding.businessEmail && <p>{branding.businessEmail}</p>}
              {branding.website && <p>{branding.website}</p>}
              {branding.licenseNumber && (
                <p>License: {branding.licenseNumber}</p>
              )}
            </div>
            {branding.customFields && branding.customFields.length > 0 && (
              <div className="mt-2 space-y-0.5 text-sm text-[var(--muted)]">
                {branding.customFields.map((cf) => (
                  <p key={cf.id}>
                    {cf.label}: {cf.value}
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <span className="inline-block rounded-[var(--radius)] bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--brand)]">
              Quote
            </span>
          </div>
        </header>

        {/* Quote title */}
        {client.quoteTitle && (
          <h1 className="mb-6 text-2xl font-bold text-[var(--foreground)]">
            {client.quoteTitle}
          </h1>
        )}

        {/* Client info + dates */}
        <div className="mb-8 grid gap-6 sm:grid-cols-2">
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Prepared for
            </p>
            <p className="font-semibold text-[var(--foreground)]">
              {client.customerName}
            </p>
            {client.customerEmail && (
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {client.customerEmail}
              </p>
            )}
            {client.customerPhone && (
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {client.customerPhone}
              </p>
            )}
            {client.projectAddress && (
              <p className="mt-2 text-sm text-[var(--muted)]">
                {client.projectAddress}
              </p>
            )}
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Dates
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Created</span>
                <span className="font-medium text-[var(--foreground)]">
                  {formatDate(createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Valid until</span>
                <span className="font-medium text-[var(--foreground)]">
                  {formatDate(validUntil)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Scope of work */}
        <section className="mb-8">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
            Scope of Work
          </h3>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
            {/* New items */}
            {hasItems &&
              items.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-start justify-between gap-4 px-5 py-4 ${
                    i < items.length - 1 ? "border-b border-[var(--line)]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--foreground)]">
                        {item.name}
                      </p>
                      <span className="rounded bg-[var(--brand-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--muted)]">
                        {item.type}
                      </span>
                    </div>
                    {item.scopeDescription && (
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {item.scopeDescription}
                      </p>
                    )}
                    {item.paintColor && (
                      <p className="mt-0.5 text-xs text-[var(--accent-strong)]">
                        Color: {item.paintColor}
                      </p>
                    )}
                  </div>
                  <p className="shrink-0 font-mono font-bold text-[var(--foreground)]">
                    {formatCurrency(item.price)}
                  </p>
                </div>
              ))}

            {/* Legacy rooms */}
            {!hasItems &&
              legacyRooms.map((room, i) => (
                <div
                  key={room.id}
                  className={`flex items-start justify-between gap-4 px-5 py-4 ${
                    i < legacyRooms.length - 1
                      ? "border-b border-[var(--line)]"
                      : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-[var(--foreground)]">
                        {room.name}
                      </p>
                      <span className="rounded bg-[var(--brand-muted)] px-1.5 py-0.5 text-[10px] font-medium uppercase text-[var(--muted)]">
                        {room.scope}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      {room.paintableWallArea.toFixed(0)} sq ft walls
                      {room.ceilingArea > 0 &&
                        ` · ${room.ceilingArea.toFixed(0)} sq ft ceiling`}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono font-bold text-[var(--foreground)]">
                    {formatCurrency(room.roomSubtotal)}
                  </p>
                </div>
              ))}
          </div>
        </section>

        {/* Totals */}
        <section className="mb-8">
          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--surface)]">
            <div className="space-y-2 px-5 py-4">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--muted)]">Subtotal</span>
                <span className="font-mono text-[var(--foreground)]">
                  {formatCurrency(summary.subtotal)}
                </span>
              </div>

              {(summary.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span className="font-mono">
                    -{formatCurrency(summary.discount)}
                  </span>
                </div>
              )}

              {summary.taxTotal > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Tax</span>
                  <span className="font-mono text-[var(--foreground)]">
                    {formatCurrency(summary.taxTotal)}
                  </span>
                </div>
              )}
            </div>

            <div className="border-t border-[var(--line)] bg-[var(--brand-soft)] px-5 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--brand)]">
                  Grand Total
                </span>
                <span className="text-2xl font-bold font-mono text-[var(--brand)]">
                  {formatCurrency(summary.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Terms / Notes */}
        {client.notes && (
          <section className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--muted)]">
              Terms &amp; Notes
            </h3>
            <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-5 py-4">
              <p className="whitespace-pre-line text-sm text-[var(--foreground)]">
                {client.notes}
              </p>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-[var(--line)] pt-6 text-center">
          <p className="text-xs text-[var(--muted)]">
            Powered by{" "}
            <a
              href="https://paintpricing.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[var(--brand)] hover:underline"
            >
              PaintPricing.com
            </a>
          </p>
        </footer>
      </div>
    </main>
  );
}

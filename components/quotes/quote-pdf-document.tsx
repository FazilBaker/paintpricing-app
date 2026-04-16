import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { QUOTE_TERMS } from "@/lib/constants";
import type { ExteriorCalcInputs, InteriorCalcInputs, QuoteDraftPayload, QuoteItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/* ── Brand palette ── */
const NAVY = "#1E3A5F";
const AMBER = "#F5A623";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const BRAND_SOFT = "#E8EEF6";
const BG = "#FFFFFF";
const TEXT_DARK = "#1A1A2E";
const GREEN = "#16A34A";

/* ── Styles ── */
const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 60,
    fontSize: 10,
    color: TEXT_DARK,
    fontFamily: "Helvetica",
    backgroundColor: BG,
  },

  /* Top accent bar */
  accentBar: { height: 5, backgroundColor: NAVY },

  body: { paddingHorizontal: 40, paddingTop: 24 },

  /* ── HEADER ── */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    maxWidth: 300,
  },
  logo: {
    width: 52,
    height: 52,
    objectFit: "contain",
    borderRadius: 4,
    marginRight: 10,
  },
  businessName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: NAVY,
    marginBottom: 3,
  },
  contactLine: { fontSize: 8.5, color: MUTED, lineHeight: 1.55 },

  headerRight: { alignItems: "flex-end", maxWidth: 220 },
  estimateTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    color: NAVY,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  quoteNumber: { fontSize: 8, color: MUTED, marginBottom: 6 },
  preparedLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  clientName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: TEXT_DARK,
    textAlign: "right",
  },
  clientDetail: { fontSize: 8.5, color: MUTED, textAlign: "right" },

  /* Divider */
  hr: {
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginTop: 16,
    marginBottom: 0,
  },

  /* ── PROJECT INFO BAR ── */
  infoBar: {
    flexDirection: "row",
    backgroundColor: BRAND_SOFT,
    borderRadius: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  infoCol: { flex: 1 },
  infoLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: NAVY,
  },

  /* ── SECTION ── */
  section: { marginTop: 20 },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingBottom: 5,
    borderBottomWidth: 1.5,
    borderBottomColor: NAVY,
    marginBottom: 6,
  },

  /* ── SCOPE TABLE HEADER ── */
  tableHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    marginBottom: 2,
  },
  tableHeaderText: {
    fontSize: 7.5,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ── LINE ITEM (row-level = flexDirection row, only one level deep) ── */
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  /* Text stack lives inside a plain View (NO nested flex) */
  itemTextStack: { width: "82%" },
  itemName: { fontFamily: "Helvetica-Bold", fontSize: 10, color: TEXT_DARK, marginBottom: 2 },
  itemScope: { fontSize: 8.5, color: MUTED, lineHeight: 1.5, marginBottom: 2 },
  itemDetail: { fontSize: 8, color: "#475569", lineHeight: 1.4, marginBottom: 1 },
  itemColor: { fontSize: 8, color: AMBER, marginTop: 1 },
  itemNote: { fontSize: 8, color: MUTED, fontStyle: "italic", marginTop: 1 },
  /* Price on the right -- simple Text, no wrapper needed */
  itemPrice: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10.5,
    color: TEXT_DARK,
    textAlign: "right",
    width: "18%",
    paddingTop: 1,
  },

  /* ── SUMMARY / TOTALS ── */
  totalsWrap: { marginTop: 14, alignItems: "flex-end" },
  totalsTable: { width: 230 },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  totalsLabel: { fontSize: 9, color: MUTED, width: 130 },
  totalsValue: { fontSize: 9, fontFamily: "Helvetica-Bold", textAlign: "right", width: 90 },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: NAVY,
  },
  grandLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    color: NAVY,
    width: 130,
  },
  grandValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 15,
    color: NAVY,
    textAlign: "right",
    width: 90,
  },

  /* ── TERMS ── */
  termBullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 3,
  },
  termDot: { fontSize: 8, color: MUTED, marginRight: 6, marginTop: 1 },
  termText: { fontSize: 8, color: MUTED, lineHeight: 1.5, flex: 1 },

  /* ── ACCEPTANCE ── */
  acceptBox: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 6,
    padding: 16,
  },
  acceptTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: NAVY,
    marginBottom: 4,
  },
  acceptBody: { fontSize: 8.5, color: MUTED, lineHeight: 1.5, marginBottom: 14 },
  sigRow: { flexDirection: "row", gap: 28 },
  sigBlock: { flex: 1 },
  sigLine: { borderBottomWidth: 1, borderBottomColor: TEXT_DARK, height: 28 },
  sigLabel: {
    fontSize: 7,
    color: MUTED,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  /* ── FOOTER ── */
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: LINE,
    paddingTop: 6,
  },
  footerText: { fontSize: 7, color: MUTED },
  pageNumber: { fontSize: 7, color: MUTED },
});

/* ── Helpers ── */

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function moneyDetailed(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function num(v: number) {
  return new Intl.NumberFormat("en-US").format(v);
}

/** Build a human-readable detail line from interior calc inputs */
function interiorDetail(inp: InteriorCalcInputs, defaultCoats: number): string {
  const parts: string[] = [];
  const wallSqFt = inp.defaultWallSqFt || 0;
  if (wallSqFt > 0) parts.push(`${num(wallSqFt)} sq ft walls`);
  if (inp.includeCeiling && (inp.defaultCeilingSqFt ?? 0) > 0) {
    parts.push(`${num(inp.defaultCeilingSqFt)} sq ft ceiling`);
  }
  if ((inp.trimLinearFeet ?? 0) > 0) parts.push(`${num(inp.trimLinearFeet)} lf trim`);
  if ((inp.doorCount ?? 0) > 0) parts.push(`${inp.doorCount} door${inp.doorCount > 1 ? "s" : ""}`);
  if ((inp.windowCount ?? 0) > 0) parts.push(`${inp.windowCount} window${inp.windowCount > 1 ? "s" : ""}`);
  const coats = defaultCoats || 2;
  if (coats !== 2) parts.push(`${coats} coats`);
  else parts.push("2 coats");
  if (inp.heavyPrep) parts.push("Heavy prep");
  if (inp.moistureFlag) parts.push("Moisture barrier");
  return parts.join("  \u00B7  ");
}

/** Build a human-readable detail line from exterior calc inputs */
function exteriorDetail(inp: ExteriorCalcInputs): string {
  const parts: string[] = [];
  if ((inp.sqFt ?? 0) > 0) parts.push(`${num(inp.sqFt)} sq ft`);
  if (inp.useSpray) parts.push("Spray application");
  if ((inp.coats ?? 0) > 0) parts.push(`${inp.coats} coat${inp.coats > 1 ? "s" : ""}`);
  if (inp.heavyPrep) parts.push("Heavy prep");
  return parts.join("  \u00B7  ");
}

/* ── PDF Document ── */

export function QuotePdfDocument({ payload }: { payload: QuoteDraftPayload }) {
  const items: QuoteItem[] = payload.items?.length ? payload.items : [];

  /* Legacy fallback: build display items from summary.rooms */
  const legacyItems: { name: string; price: number; description: string; detail: string }[] = [];
  if (items.length === 0 && payload.summary.rooms?.length) {
    for (const room of payload.summary.rooms) {
      legacyItems.push({
        name: room.name,
        price: room.roomSubtotal,
        description:
          room.scope === "interior"
            ? `Interior painting \u2014 walls${room.ceilingArea > 0 ? ", ceiling" : ""}, and trim. Approximately ${(room.wallGallons + room.trimGallons).toFixed(1)} gallons of paint.`
            : `Exterior painting \u2014 ${num(room.wallArea)} sq ft surface area. Approximately ${room.wallGallons.toFixed(1)} gallons of paint.`,
        detail:
          room.scope === "interior"
            ? `${num(room.wallArea)} sq ft walls${room.ceilingArea > 0 ? `  \u00B7  ${num(room.ceilingArea)} sq ft ceiling` : ""}  \u00B7  2 coats`
            : `${num(room.wallArea)} sq ft  \u00B7  2 coats`,
      });
    }
  }

  const createdDate = formatDate(new Date().toISOString());
  const validDays = payload.client.quoteValidDays || 7;
  const expiresDate = formatDate(
    new Date(Date.now() + validDays * 86400000).toISOString(),
  );
  const defaultCoats = payload.settings.defaultCoats || 2;
  const customFields = payload.branding.customFields ?? [];

  /* Quote number: first 8 chars of any item ID, or date-based fallback */
  const quoteRef = items[0]?.id
    ? items[0].id.substring(0, 8).toUpperCase()
    : new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const hasDiscount = (payload.summary.discount ?? 0) > 0;
  const hasTax = payload.summary.taxTotal > 0;

  return (
    <Document>
      <Page size="LETTER" style={s.page}>
        {/* ── Navy accent bar ── */}
        <View style={s.accentBar} />

        <View style={s.body}>
          {/* ════════════════════════════════════════════
              HEADER
          ════════════════════════════════════════════ */}
          <View style={s.headerRow}>
            {/* Left: Logo + business info */}
            <View style={s.headerLeft}>
              {payload.branding.logoUrl ? (
                <Image src={payload.branding.logoUrl} style={s.logo} />
              ) : null}
              <View>
                <Text style={s.businessName}>{payload.branding.businessName}</Text>
                {payload.branding.phone ? (
                  <Text style={s.contactLine}>{payload.branding.phone}</Text>
                ) : null}
                {payload.branding.businessEmail ? (
                  <Text style={s.contactLine}>{payload.branding.businessEmail}</Text>
                ) : null}
                {payload.branding.website ? (
                  <Text style={s.contactLine}>{payload.branding.website}</Text>
                ) : null}
                {payload.branding.licenseNumber ? (
                  <Text style={s.contactLine}>Lic# {payload.branding.licenseNumber}</Text>
                ) : null}
                {customFields.map((cf) => (
                  <Text key={cf.id} style={s.contactLine}>
                    {cf.label}: {cf.value}
                  </Text>
                ))}
              </View>
            </View>

            {/* Right: ESTIMATE title + prepared-for */}
            <View style={s.headerRight}>
              <Text style={s.estimateTitle}>
                {payload.client.quoteTitle || "Estimate"}
              </Text>
              <Text style={s.quoteNumber}>#{quoteRef}</Text>
              {payload.client.customerName ? (
                <>
                  <Text style={s.preparedLabel}>Prepared for</Text>
                  <Text style={s.clientName}>{payload.client.customerName}</Text>
                </>
              ) : null}
              {payload.client.customerPhone ? (
                <Text style={s.clientDetail}>{payload.client.customerPhone}</Text>
              ) : null}
              {payload.client.customerEmail ? (
                <Text style={s.clientDetail}>{payload.client.customerEmail}</Text>
              ) : null}
            </View>
          </View>

          <View style={s.hr} />

          {/* ════════════════════════════════════════════
              PROJECT INFO BAR
          ════════════════════════════════════════════ */}
          <View style={s.infoBar}>
            {payload.client.projectAddress ? (
              <View style={s.infoCol}>
                <Text style={s.infoLabel}>Project Address</Text>
                <Text style={s.infoValue}>{payload.client.projectAddress}</Text>
              </View>
            ) : null}
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Date</Text>
              <Text style={s.infoValue}>{createdDate}</Text>
            </View>
            <View style={s.infoCol}>
              <Text style={s.infoLabel}>Valid Until</Text>
              <Text style={s.infoValue}>{expiresDate}</Text>
            </View>
          </View>

          {/* ════════════════════════════════════════════
              SCOPE OF WORK
          ════════════════════════════════════════════ */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Scope of Work</Text>

            {/* Column headers */}
            <View style={s.tableHeader}>
              <Text style={s.tableHeaderText}>Description</Text>
              <Text style={s.tableHeaderText}>Amount</Text>
            </View>

            {/* ── New-style items ── */}
            {items.map((item) => {
              const detailLine =
                item.interiorInputs
                  ? interiorDetail(item.interiorInputs, defaultCoats)
                  : item.exteriorInputs
                    ? exteriorDetail(item.exteriorInputs)
                    : null;

              return (
                <View key={item.id} style={s.itemRow} wrap={false}>
                  <View style={s.itemTextStack}>
                    <Text style={s.itemName}>{item.name}</Text>
                    {item.scopeDescription ? (
                      <Text style={s.itemScope}>{item.scopeDescription}</Text>
                    ) : null}
                    {detailLine ? (
                      <Text style={s.itemDetail}>{detailLine}</Text>
                    ) : null}
                    {item.paintColor ? (
                      <Text style={s.itemColor}>Color: {item.paintColor}</Text>
                    ) : null}
                    {item.note ? (
                      <Text style={s.itemNote}>Note: {item.note}</Text>
                    ) : null}
                  </View>
                  <Text style={s.itemPrice}>{money(item.price)}</Text>
                </View>
              );
            })}

            {/* ── Legacy items ── */}
            {legacyItems.map((item, i) => (
              <View key={`legacy-${i}`} style={s.itemRow} wrap={false}>
                <View style={s.itemTextStack}>
                  <Text style={s.itemName}>{item.name}</Text>
                  <Text style={s.itemScope}>{item.description}</Text>
                  <Text style={s.itemDetail}>{item.detail}</Text>
                </View>
                <Text style={s.itemPrice}>{money(item.price)}</Text>
              </View>
            ))}
          </View>

          {/* ════════════════════════════════════════════
              SUMMARY / TOTALS
          ════════════════════════════════════════════ */}
          <View style={s.totalsWrap}>
            <View style={s.totalsTable}>
              {/* Labor */}
              {payload.summary.laborHours > 0 && (
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>
                    Labor ({payload.summary.laborHours.toFixed(1)} hrs)
                  </Text>
                  <Text style={s.totalsValue}>
                    {moneyDetailed(payload.summary.laborTotal)}
                  </Text>
                </View>
              )}

              {/* Materials */}
              {payload.summary.materialsTotal > 0 && (
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>Materials</Text>
                  <Text style={s.totalsValue}>
                    {moneyDetailed(payload.summary.materialsTotal)}
                  </Text>
                </View>
              )}

              {/* Subtotal */}
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Subtotal</Text>
                <Text style={s.totalsValue}>
                  {moneyDetailed(payload.summary.subtotal)}
                </Text>
              </View>

              {/* Discount */}
              {hasDiscount && (
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>Discount</Text>
                  <Text style={{ ...s.totalsValue, color: GREEN }}>
                    -{moneyDetailed(payload.summary.discount)}
                  </Text>
                </View>
              )}

              {/* Tax */}
              {hasTax && (
                <View style={s.totalsRow}>
                  <Text style={s.totalsLabel}>
                    Tax ({payload.settings.taxPercent}%)
                  </Text>
                  <Text style={s.totalsValue}>
                    {moneyDetailed(payload.summary.taxTotal)}
                  </Text>
                </View>
              )}

              {/* Grand total */}
              <View style={s.grandRow}>
                <Text style={s.grandLabel}>Total</Text>
                <Text style={s.grandValue}>
                  {money(payload.summary.grandTotal)}
                </Text>
              </View>
            </View>
          </View>

          {/* ════════════════════════════════════════════
              TERMS & CONDITIONS
          ════════════════════════════════════════════ */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Terms & Conditions</Text>
            {payload.client.notes ? (
              /* Custom notes — render as bullet list splitting on newlines */
              payload.client.notes.split("\n").filter(Boolean).map((line, i) => (
                <View key={`note-${i}`} style={s.termBullet}>
                  <Text style={s.termDot}>{"\u2022"}</Text>
                  <Text style={s.termText}>{line.trim()}</Text>
                </View>
              ))
            ) : (
              QUOTE_TERMS.map((term, i) => (
                <View key={`term-${i}`} style={s.termBullet}>
                  <Text style={s.termDot}>{"\u2022"}</Text>
                  <Text style={s.termText}>{term}</Text>
                </View>
              ))
            )}
          </View>

          {/* ════════════════════════════════════════════
              ACCEPTANCE / SIGNATURE
          ════════════════════════════════════════════ */}
          <View style={s.acceptBox} wrap={false}>
            <Text style={s.acceptTitle}>Acceptance</Text>
            <Text style={s.acceptBody}>
              By signing below, I accept this estimate and authorize the work described above to begin. I understand that additional work beyond the scope of this estimate will be quoted separately.
            </Text>
            <View style={s.sigRow}>
              <View style={s.sigBlock}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Client Signature</Text>
              </View>
              <View style={s.sigBlock}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Printed Name</Text>
              </View>
              <View style={s.sigBlock}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>Date</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ════════════════════════════════════════════
            FOOTER
        ════════════════════════════════════════════ */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>{payload.branding.businessName}</Text>
          <Text
            style={s.pageNumber}
            render={({ pageNumber, totalPages }) =>
              totalPages > 1 ? `Page ${pageNumber} of ${totalPages}` : ""
            }
          />
          <Text style={s.footerText}>Generated with PaintPricing.com</Text>
        </View>
      </Page>
    </Document>
  );
}

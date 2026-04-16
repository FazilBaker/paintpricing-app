import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { QUOTE_TERMS } from "@/lib/constants";
import type { QuoteDraftPayload, QuoteItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

/* ── Brand colors ── */
const BRAND = "#1E3A5F";
const BRAND_SOFT = "#E8EEF6";
const ACCENT = "#F5A623";
const MUTED = "#64748B";
const LINE = "#E2E8F0";
const BG = "#FFFFFF";
const TEXT_DARK = "#1A1A2E";

const styles = StyleSheet.create({
  page: {
    padding: 0,
    fontSize: 10,
    color: TEXT_DARK,
    fontFamily: "Helvetica",
    backgroundColor: BG,
  },
  /* Brand bar at top */
  brandBar: {
    height: 6,
    backgroundColor: BRAND,
  },
  /* Main content area */
  content: {
    paddingHorizontal: 40,
    paddingTop: 24,
    paddingBottom: 32,
  },
  /* Header row */
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 20,
  },
  logo: {
    width: 56,
    height: 56,
    objectFit: "contain",
    borderRadius: 6,
  },
  businessName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 16,
    color: BRAND,
    marginBottom: 2,
  },
  muted: {
    fontSize: 9,
    color: MUTED,
    lineHeight: 1.6,
  },
  /* Quote meta box */
  metaBox: {
    backgroundColor: BRAND_SOFT,
    borderRadius: 8,
    padding: 12,
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 7,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  metaValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    color: BRAND,
  },
  /* Section */
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: BRAND,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
  },
  /* Scope of work items */
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: LINE,
    gap: 12,
  },
  itemName: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    flex: 1,
  },
  itemPrice: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "right",
    minWidth: 60,
  },
  itemDescription: {
    fontSize: 8.5,
    color: MUTED,
    marginTop: 2,
    lineHeight: 1.5,
  },
  itemColor: {
    fontSize: 8,
    color: ACCENT,
    marginTop: 1,
  },
  /* Totals */
  totalsBox: {
    marginTop: 16,
    alignItems: "flex-end",
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    paddingVertical: 3,
    minWidth: 200,
  },
  totalsLabel: {
    fontSize: 9,
    color: MUTED,
    textAlign: "right",
    width: 80,
  },
  totalsValue: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    textAlign: "right",
    width: 80,
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 24,
    paddingVertical: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: BRAND,
    minWidth: 200,
  },
  grandTotalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    color: BRAND,
    textAlign: "right",
    width: 80,
  },
  grandTotalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    color: BRAND,
    textAlign: "right",
    width: 80,
  },
  /* Terms */
  termsText: {
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.6,
  },
  /* Acceptance */
  acceptanceBox: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: LINE,
    borderRadius: 8,
    padding: 16,
  },
  signatureLine: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
  sigBlock: {
    flex: 1,
  },
  sigLine: {
    borderBottomWidth: 1,
    borderBottomColor: TEXT_DARK,
    height: 28,
  },
  sigLabel: {
    fontSize: 7,
    color: MUTED,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  /* Footer */
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
  },
  footerText: {
    fontSize: 7,
    color: MUTED,
  },
});

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

export function QuotePdfDocument({ payload }: { payload: QuoteDraftPayload }) {
  const items: QuoteItem[] = payload.items?.length
    ? payload.items
    : [];

  // For legacy quotes that only have rooms/exteriorItems, build a display list
  const legacyItems: { name: string; price: number; description: string }[] = [];
  if (items.length === 0 && payload.summary.rooms?.length) {
    for (const room of payload.summary.rooms) {
      legacyItems.push({
        name: room.name,
        price: room.roomSubtotal,
        description:
          room.scope === "interior"
            ? `Walls, ${room.ceilingArea > 0 ? "ceiling, " : ""}trim. ${(room.wallGallons + room.trimGallons).toFixed(1)} gal paint.`
            : `${room.wallArea} sq ft. ${room.wallGallons.toFixed(1)} gal paint.`,
      });
    }
  }

  const createdDate = formatDate(new Date().toISOString());
  const validDays = payload.client.quoteValidDays || 7;
  const expiresDate = formatDate(
    new Date(Date.now() + validDays * 86400000).toISOString(),
  );

  const customFields = payload.branding.customFields ?? [];

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Brand color bar */}
        <View style={styles.brandBar} />

        <View style={styles.content}>
          {/* Header: business info + prepared for */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", flex: 1 }}>
              {payload.branding.logoUrl && (
                <Image src={payload.branding.logoUrl} style={styles.logo} />
              )}
              <View>
                <Text style={styles.businessName}>
                  {payload.branding.businessName}
                </Text>
                {payload.branding.phone ? (
                  <Text style={styles.muted}>{payload.branding.phone}</Text>
                ) : null}
                {payload.branding.businessEmail ? (
                  <Text style={styles.muted}>{payload.branding.businessEmail}</Text>
                ) : null}
                {payload.branding.website ? (
                  <Text style={styles.muted}>{payload.branding.website}</Text>
                ) : null}
                {payload.branding.licenseNumber ? (
                  <Text style={styles.muted}>Lic# {payload.branding.licenseNumber}</Text>
                ) : null}
                {customFields.map((cf) => (
                  <Text key={cf.id} style={styles.muted}>
                    {cf.label}: {cf.value}
                  </Text>
                ))}
              </View>
            </View>

            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 20, color: BRAND }}>
                {payload.client.quoteTitle || "Estimate"}
              </Text>
              {payload.client.customerName ? (
                <Text style={{ ...styles.muted, marginTop: 4 }}>
                  Prepared for: {payload.client.customerName}
                </Text>
              ) : null}
              {payload.client.customerPhone ? (
                <Text style={styles.muted}>{payload.client.customerPhone}</Text>
              ) : null}
              {payload.client.customerEmail ? (
                <Text style={styles.muted}>{payload.client.customerEmail}</Text>
              ) : null}
            </View>
          </View>

          {/* Meta box: dates, address */}
          <View style={styles.metaBox}>
            {payload.client.projectAddress ? (
              <View style={styles.metaCol}>
                <Text style={styles.metaLabel}>Project address</Text>
                <Text style={styles.metaValue}>{payload.client.projectAddress}</Text>
              </View>
            ) : null}
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{createdDate}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Valid until</Text>
              <Text style={styles.metaValue}>{expiresDate}</Text>
            </View>
          </View>

          {/* Scope of Work */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Scope of Work</Text>

            {/* New items */}
            {items.map((item, i) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.scopeDescription ? (
                    <Text style={styles.itemDescription}>{item.scopeDescription}</Text>
                  ) : null}
                  {item.paintColor ? (
                    <Text style={styles.itemColor}>Color: {item.paintColor}</Text>
                  ) : null}
                </View>
                <Text style={styles.itemPrice}>{money(item.price)}</Text>
              </View>
            ))}

            {/* Legacy items (for old saved quotes) */}
            {legacyItems.map((item, i) => (
              <View key={`legacy-${i}`} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                </View>
                <Text style={styles.itemPrice}>{money(item.price)}</Text>
              </View>
            ))}
          </View>

          {/* Totals */}
          <View style={styles.totalsBox}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>
                {money(payload.summary.subtotal)}
              </Text>
            </View>

            {(payload.summary.discount ?? 0) > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Discount</Text>
                <Text style={{ ...styles.totalsValue, color: "#16A34A" }}>
                  -{money(payload.summary.discount)}
                </Text>
              </View>
            )}

            {payload.summary.taxTotal > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>
                  Tax ({payload.settings.taxPercent}%)
                </Text>
                <Text style={styles.totalsValue}>
                  {money(payload.summary.taxTotal)}
                </Text>
              </View>
            )}

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>
                {money(payload.summary.grandTotal)}
              </Text>
            </View>
          </View>

          {/* Terms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <Text style={styles.termsText}>
              {payload.client.notes || QUOTE_TERMS.join(" ")}
            </Text>
          </View>

          {/* Acceptance / signature */}
          <View style={styles.acceptanceBox}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, color: BRAND, marginBottom: 4 }}>
              Acceptance
            </Text>
            <Text style={styles.termsText}>
              By signing below, I accept this estimate and authorize the work to begin as described above.
            </Text>
            <View style={styles.signatureLine}>
              <View style={styles.sigBlock}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Client Signature</Text>
              </View>
              <View style={styles.sigBlock}>
                <View style={styles.sigLine} />
                <Text style={styles.sigLabel}>Date</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {payload.branding.businessName}
          </Text>
          <Text style={styles.footerText}>
            Generated with PaintPricing.com
          </Text>
        </View>
      </Page>
    </Document>
  );
}

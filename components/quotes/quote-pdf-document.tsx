import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

import { QUOTE_TERMS } from "@/lib/constants";
import type { QuoteDraftPayload } from "@/lib/types";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    color: "#182126",
    fontFamily: "Helvetica",
    backgroundColor: "#fffdf7",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
  },
  muted: {
    color: "#5f6a72",
    lineHeight: 1.5,
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#d8dfe4",
  },
  card: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#d8dfe4",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#ffffff",
  },
  roomTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 13,
    marginBottom: 6,
  },
  totalBox: {
    marginTop: 18,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#dce8fb",
  },
  totalValue: {
    marginTop: 6,
    fontFamily: "Helvetica-Bold",
    fontSize: 24,
    color: "#104a9e",
  },
});

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function QuotePdfDocument({ payload }: { payload: QuoteDraftPayload }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.row}>
          <View>
            <Text style={styles.heading}>{payload.client.quoteTitle}</Text>
            <Text style={styles.muted}>{payload.branding.businessName}</Text>
            <Text style={styles.muted}>{payload.branding.businessEmail}</Text>
            <Text style={styles.muted}>{payload.branding.phone}</Text>
          </View>
          <View>
            <Text style={styles.roomTitle}>Prepared for</Text>
            <Text style={styles.muted}>{payload.client.customerName}</Text>
            <Text style={styles.muted}>{payload.client.customerEmail}</Text>
            <Text style={styles.muted}>{payload.client.customerPhone}</Text>
            <Text style={styles.muted}>{payload.client.projectAddress}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.roomTitle}>Room breakdown</Text>
          {payload.summary.rooms.map((room) => (
            <View key={room.id} style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.roomTitle}>{room.name}</Text>
                <Text>{money(room.roomSubtotal)}</Text>
              </View>
              <Text style={styles.muted}>
                Walls: {room.paintableWallArea.toFixed(0)} sq ft | Ceiling:{" "}
                {room.ceilingArea.toFixed(0)} sq ft | Trim:{" "}
                {room.trimPaintArea.toFixed(0)} sq ft
              </Text>
              <Text style={styles.muted}>
                Gallons: {(room.wallGallons + room.trimGallons).toFixed(2)} |
                Labor hours: {room.laborHours.toFixed(2)}
              </Text>
              {room.note ? <Text style={styles.muted}>{room.note}</Text> : null}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.roomTitle}>Project totals</Text>
          <Text style={styles.muted}>
            Total paint: {payload.summary.totalGallons.toFixed(2)} gallons
          </Text>
          <Text style={styles.muted}>
            Labor: {payload.summary.laborHours.toFixed(2)} hours
          </Text>
          <Text style={styles.muted}>
            Materials: {money(payload.summary.materialsTotal)}
          </Text>
          <Text style={styles.muted}>Tax: {money(payload.summary.taxTotal)}</Text>
          <View style={styles.totalBox}>
            <Text>Total estimate</Text>
            <Text style={styles.totalValue}>{money(payload.summary.grandTotal)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.roomTitle}>Terms</Text>
          <Text style={styles.muted}>
            {payload.client.notes || QUOTE_TERMS.join(" ")}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export type BillingCycle = "monthly" | "yearly" | "lifetime";

export type BillingStatus =
  | "inactive"
  | "approval_pending"
  | "active"
  | "past_due"
  | "canceled"
  | "refunded";

export type QuoteScope = "interior" | "exterior";

export type RoomTemplateKey =
  | "living-room"
  | "master-bedroom"
  | "standard-bedroom"
  | "kitchen"
  | "bathroom"
  | "hallway"
  | "custom";

export type ExteriorTemplateKey =
  | "siding"
  | "trim-fascia"
  | "soffit"
  | "doors"
  | "garage-door"
  | "shutters"
  | "deck-porch"
  | "fence"
  | "custom-exterior";

export type AnyTemplateKey = RoomTemplateKey | ExteriorTemplateKey;

export type QuoteItemType = "interior" | "exterior" | "custom";

export type ProfileSettings = {
  hourlyLaborRate: number;
  paintCostPerGallon: number;
  wallCoverageSqFtPerGallon: number;
  trimCoverageSqFtPerGallon: number;
  defaultCoats: number;
  materialMarkupPercent: number;
  taxPercent: number;
  minimumJobCharge: number;
};

export type CustomField = {
  id: string;
  label: string;
  value: string;
};

export type ProfileRecord = {
  id: string;
  businessName: string | null;
  phone: string | null;
  businessEmail: string | null;
  licenseNumber: string | null;
  logoUrl: string | null;
  website: string | null;
  customFields: CustomField[];
  billingStatus: BillingStatus;
  billingCycle: BillingCycle | null;
  paypalSubscriptionId: string | null;
  paypalPayerId: string | null;
  guaranteeEligibleUntil: string | null;
  refundUsedAt: string | null;
  ratesConfiguredAt: string | null;
  freeQuotesUsed: number;
  freeQuotesLimit: number;
  lifetimeDealClaimedAt: string | null;
  settings: ProfileSettings;
};

export type RoomTemplate = {
  key: RoomTemplateKey;
  label: string;
  defaultWallSqFt: number;
  defaultCeilingSqFt: number;
  defaultTrimLinearFeet: number;
  defaultDoorCount: number;
  defaultWindowCount: number;
  ceilingIncluded: boolean;
  note: string;
  moistureFlag?: boolean;
  heavyTrim?: boolean;
};

export type ExteriorTemplate = {
  key: ExteriorTemplateKey;
  label: string;
  defaultSqFt: number;
  coverageSqFtPerGallon: number;
  productionSqFtPerHourBrush: number;
  productionSqFtPerHourSpray: number;
  defaultCoats: number;
  note: string;
  isAddOn?: boolean;
};

/* ── Calculator input types (used inside QuoteItem) ── */

export type InteriorCalcInputs = {
  defaultWallSqFt: number;
  defaultCeilingSqFt: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  includeCeiling: boolean;
  trimLinearFeet: number;
  doorCount: number;
  windowCount: number;
  paintDoors: boolean;
  paintWindows: boolean;
  heavyPrep: boolean;
  moistureFlag?: boolean;
};

export type ExteriorCalcInputs = {
  sqFt: number;
  coats: number;
  useSpray: boolean;
  heavyPrep: boolean;
};

/* ── Unified quote item — the core line item ── */

export type QuoteItem = {
  id: string;
  type: QuoteItemType;
  templateKey: AnyTemplateKey | null;
  name: string;
  price: number; // painter's final price (editable)
  suggestedPrice: number; // engine calculation (read-only, 0 for custom)
  scopeDescription: string; // for PDF scope-of-work
  paintColor: string; // optional paint color/product
  note: string;
  // Calculator state — only for interior/exterior items
  interiorInputs: InteriorCalcInputs | null;
  exteriorInputs: ExteriorCalcInputs | null;
};

/* ── Legacy types kept for backward compat with saved quotes ── */

export type QuoteRoomInput = {
  id: string;
  scope: QuoteScope;
  templateKey: RoomTemplateKey;
  name: string;
  defaultWallSqFt: number;
  defaultCeilingSqFt: number;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  includeCeiling: boolean;
  trimLinearFeet: number;
  doorCount: number;
  windowCount: number;
  paintDoors: boolean;
  paintWindows: boolean;
  heavyPrep: boolean;
  note?: string;
  moistureFlag?: boolean;
};

export type QuoteExteriorInput = {
  id: string;
  scope: "exterior";
  templateKey: ExteriorTemplateKey;
  name: string;
  sqFt: number;
  coats: number;
  useSpray: boolean;
  heavyPrep: boolean;
  note?: string;
};

export type QuoteLineItem = QuoteRoomInput | QuoteExteriorInput;

export type QuoteClientInfo = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  projectAddress: string;
  quoteTitle: string;
  quoteValidDays: number;
  notes: string;
};

export type CalculatedRoom = {
  id: string;
  name: string;
  scope: QuoteScope;
  templateKey: AnyTemplateKey;
  wallArea: number;
  ceilingArea: number;
  paintableWallArea: number;
  trimPaintArea: number;
  doorsPaintArea: number;
  windowsPaintArea: number;
  wallGallons: number;
  trimGallons: number;
  laborHours: number;
  materialCost: number;
  materialSell: number;
  roomSubtotal: number;
  note?: string;
  moistureFlag?: boolean;
};

export type QuoteSummary = {
  rooms: CalculatedRoom[];
  items: QuoteItem[];
  wallGallons: number;
  trimGallons: number;
  totalGallons: number;
  laborHours: number;
  laborTotal: number;
  materialBaseTotal: number;
  materialsTotal: number;
  subtotalBeforeMinimum: number;
  subtotal: number;
  discount: number;
  taxTotal: number;
  grandTotal: number;
  minimumApplied: boolean;
};

export type QuoteDraftPayload = {
  client: QuoteClientInfo;
  items: QuoteItem[];
  // Legacy — kept for backward compat with existing saved quotes
  rooms: QuoteRoomInput[];
  exteriorItems: QuoteExteriorInput[];
  summary: QuoteSummary;
  discount: { type: "flat" | "percent"; value: number };
  settings: ProfileSettings;
  branding: {
    businessName: string;
    businessEmail: string;
    phone: string;
    website?: string | null;
    licenseNumber?: string | null;
    logoUrl?: string | null;
    customFields?: CustomField[];
  };
};

export type QuoteRecord = {
  id: string;
  clientName: string;
  projectAddress: string;
  total: number;
  createdAt: string;
  pdfUrl: string | null;
  quoteData: QuoteDraftPayload;
  version: number;
  parentQuoteId: string | null;
  isLatest: boolean;
  isUnlocked: boolean;
};

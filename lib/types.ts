export type BillingCycle = "monthly" | "yearly" | "lifetime";

export type AccountStatus = "active" | "suspended" | "banned";

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

/**
 * Every priceable surface in the catalog, not just exterior ones. The name is historical: this
 * union started as the nine exterior templates and now carries interior detail work (cabinets,
 * baseboard, crown molding, window sash) and commercial striping too. Renaming it would churn
 * every call site for no behavioural gain, and the strings themselves are persisted inside saved
 * quotes as QuoteItem.templateKey, so they are canonical and must never change.
 */
export type ExteriorTemplateKey =
  // exterior
  | "siding"
  | "stucco"
  | "brick"
  | "trim-fascia"
  | "soffit"
  | "doors"
  | "garage-door"
  | "shutters"
  | "deck-porch"
  | "fence"
  | "gutters-downspouts"
  // interior detail
  | "cabinets"
  | "interior-doors"
  | "baseboard"
  | "crown-molding"
  | "wainscoting"
  | "stair-spindles"
  | "handrail"
  | "window-sash"
  // commercial and striping
  | "parking-lot-striping"
  | "parking-stalls"
  | "curb-painting"
  | "custom-exterior";

/** How a surface is measured, which decides what the builder asks the painter for. */
export type SurfaceBasisKey = "area" | "linear" | "unit";

/**
 * Substrate condition, which scales prep hours (good 0.5, fair 1.0, poor 1.8 in the catalog).
 * The free calculator on the marketing site has offered this since launch; the paid product only
 * had a heavyPrep boolean, so a painter could not say "this wall is sound" and see the prep drop.
 */
export type ConditionKey = "good" | "fair" | "poor";

/** Paint tier. Sets the material cost per gallon when the painter picks one for a line. */
export type PaintGradeKey = "economy" | "standard" | "premium";

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
  accountStatus: AccountStatus;
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
  /**
   * The default quantity in the surface's OWN unit. Still named defaultSqFt because
   * ExteriorCalcInputs.sqFt is persisted under that name inside saved quotes; for a linear or
   * unit surface it means linear feet or a count. measureUnit says which.
   */
  defaultSqFt: number;
  basis: SurfaceBasisKey;
  /** "sq ft", "lin ft", "doors and drawer fronts", "stalls" ... */
  measureUnit: string;
  /** Field label shown to the painter, e.g. "Cabinet doors and drawer fronts". */
  measureLabel: string;
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
  /** Optional so existing saved quotes deserialize unchanged; absent behaves as "fair". */
  condition?: ConditionKey;
  /** Absent means fall back to the painter's own paintCostPerGallon setting. */
  paintGrade?: PaintGradeKey;
};

export type ExteriorCalcInputs = {
  sqFt: number;
  coats: number;
  useSpray: boolean;
  heavyPrep: boolean;
  /** Optional so existing saved quotes deserialize unchanged; absent behaves as "fair". */
  condition?: ConditionKey;
  /** Absent means fall back to the painter's own paintCostPerGallon setting. */
  paintGrade?: PaintGradeKey;
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

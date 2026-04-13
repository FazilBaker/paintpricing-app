export type BillingCycle = "monthly" | "yearly" | "lifetime";

export type BillingStatus =
  | "inactive"
  | "approval_pending"
  | "active"
  | "past_due"
  | "canceled"
  | "refunded";

export type RoomTemplateKey =
  | "living-room"
  | "master-bedroom"
  | "standard-bedroom"
  | "kitchen"
  | "bathroom"
  | "hallway"
  | "custom";

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

export type ProfileRecord = {
  id: string;
  businessName: string | null;
  phone: string | null;
  businessEmail: string | null;
  licenseNumber: string | null;
  logoUrl: string | null;
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

export type QuoteRoomInput = {
  id: string;
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
  templateKey: RoomTemplateKey;
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
  wallGallons: number;
  trimGallons: number;
  totalGallons: number;
  laborHours: number;
  laborTotal: number;
  materialBaseTotal: number;
  materialsTotal: number;
  subtotalBeforeMinimum: number;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  minimumApplied: boolean;
};

export type QuoteDraftPayload = {
  client: QuoteClientInfo;
  rooms: QuoteRoomInput[];
  summary: QuoteSummary;
  settings: ProfileSettings;
  branding: {
    businessName: string;
    businessEmail: string;
    phone: string;
    licenseNumber?: string | null;
    logoUrl?: string | null;
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
};

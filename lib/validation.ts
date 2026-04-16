import { z } from "zod";

/* ── New unified item schema ── */

const interiorCalcInputsSchema = z.object({
  defaultWallSqFt: z.number().min(0).max(50_000),
  defaultCeilingSqFt: z.number().min(0).max(50_000),
  length: z.number().min(0).max(1000).nullable().optional(),
  width: z.number().min(0).max(1000).nullable().optional(),
  height: z.number().min(0).max(100).nullable().optional(),
  includeCeiling: z.boolean(),
  trimLinearFeet: z.number().min(0).max(10_000),
  doorCount: z.number().int().min(0).max(100),
  windowCount: z.number().int().min(0).max(100),
  paintDoors: z.boolean(),
  paintWindows: z.boolean(),
  heavyPrep: z.boolean(),
  moistureFlag: z.boolean().optional(),
});

const exteriorCalcInputsSchema = z.object({
  sqFt: z.number().min(0).max(100_000),
  coats: z.number().int().min(1).max(10),
  useSpray: z.boolean(),
  heavyPrep: z.boolean(),
});

const quoteItemSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["interior", "exterior", "custom"]),
  templateKey: z.string().max(50).nullable(),
  name: z.string().min(1, "Item name is required").max(200),
  price: z.number().min(0).max(1_000_000),
  suggestedPrice: z.number().min(0),
  scopeDescription: z.string().max(1000).default(""),
  paintColor: z.string().max(200).default(""),
  note: z.string().max(500).default(""),
  interiorInputs: interiorCalcInputsSchema.nullable(),
  exteriorInputs: exteriorCalcInputsSchema.nullable(),
});

/* ── Legacy room/exterior schemas (for backward compat) ── */

const roomTemplateKeySchema = z.enum([
  "living-room",
  "master-bedroom",
  "standard-bedroom",
  "kitchen",
  "bathroom",
  "hallway",
  "custom",
]);

const quoteRoomInputSchema = z.object({
  id: z.string().min(1),
  scope: z.literal("interior").default("interior"),
  templateKey: roomTemplateKeySchema,
  name: z.string().min(1).max(100),
  defaultWallSqFt: z.number().min(0).max(50_000),
  defaultCeilingSqFt: z.number().min(0).max(50_000),
  length: z.number().min(0).max(1000).nullable().optional(),
  width: z.number().min(0).max(1000).nullable().optional(),
  height: z.number().min(0).max(100).nullable().optional(),
  includeCeiling: z.boolean(),
  trimLinearFeet: z.number().min(0).max(10_000),
  doorCount: z.number().int().min(0).max(100),
  windowCount: z.number().int().min(0).max(100),
  paintDoors: z.boolean(),
  paintWindows: z.boolean(),
  heavyPrep: z.boolean(),
  note: z.string().max(500).optional(),
  moistureFlag: z.boolean().optional(),
});

const quoteClientInfoSchema = z.object({
  customerName: z.string().max(200),
  customerEmail: z.string().max(200),
  customerPhone: z.string().max(50),
  projectAddress: z.string().max(500),
  quoteTitle: z.string().max(200),
  quoteValidDays: z.number().int().min(1).max(365),
  notes: z.string().max(2000),
});

const profileSettingsSchema = z.object({
  hourlyLaborRate: z.number().min(0).max(1000),
  paintCostPerGallon: z.number().min(0).max(1000),
  wallCoverageSqFtPerGallon: z.number().min(1).max(2000),
  trimCoverageSqFtPerGallon: z.number().min(1).max(2000),
  defaultCoats: z.number().int().min(1).max(10),
  materialMarkupPercent: z.number().min(0).max(500),
  taxPercent: z.number().min(0).max(100),
  minimumJobCharge: z.number().min(0).max(100_000),
});

const exteriorTemplateKeySchema = z.enum([
  "siding",
  "trim-fascia",
  "soffit",
  "doors",
  "garage-door",
  "shutters",
  "deck-porch",
  "fence",
  "custom-exterior",
]);

const quoteExteriorInputSchema = z.object({
  id: z.string().min(1),
  scope: z.literal("exterior"),
  templateKey: exteriorTemplateKeySchema,
  name: z.string().min(1).max(100),
  sqFt: z.number().min(0).max(100_000),
  coats: z.number().int().min(1).max(10),
  useSpray: z.boolean(),
  heavyPrep: z.boolean(),
  note: z.string().max(500).optional(),
});

const brandingSchema = z.object({
  businessName: z.string().max(200),
  businessEmail: z.string().max(200),
  phone: z.string().max(50),
  website: z.string().max(500).nullable().optional(),
  licenseNumber: z.string().max(100).nullable().optional(),
  logoUrl: z.string().max(500).nullable().optional(),
  customFields: z.array(z.object({
    id: z.string(),
    label: z.string().max(100),
    value: z.string().max(500),
  })).optional(),
});

const discountSchema = z.object({
  type: z.enum(["flat", "percent"]),
  value: z.number().min(0).max(1_000_000),
}).default({ type: "flat", value: 0 });

export const quoteDraftPayloadSchema = z.object({
  client: quoteClientInfoSchema,
  items: z.array(quoteItemSchema).max(100).default([]),
  // Legacy fields — optional for backward compat
  rooms: z.array(quoteRoomInputSchema).max(50).default([]),
  exteriorItems: z.array(quoteExteriorInputSchema).max(50).default([]),
  discount: discountSchema,
  summary: z.object({
    rooms: z.array(z.any()).default([]),
    items: z.array(z.any()).default([]),
    wallGallons: z.number().min(0),
    trimGallons: z.number().min(0),
    totalGallons: z.number().min(0),
    laborHours: z.number().min(0),
    laborTotal: z.number().min(0),
    materialBaseTotal: z.number().min(0),
    materialsTotal: z.number().min(0),
    subtotalBeforeMinimum: z.number().min(0),
    subtotal: z.number().min(0),
    discount: z.number().min(0).default(0),
    taxTotal: z.number().min(0),
    grandTotal: z.number().min(0),
    minimumApplied: z.boolean(),
  }),
  settings: profileSettingsSchema,
  branding: brandingSchema,
}).refine(
  (data) => data.items.length > 0 || data.rooms.length > 0 || data.exteriorItems.length > 0,
  { message: "Add at least one item to the quote." },
);

export const profileSetupSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(200),
  phone: z.string().max(50),
  businessEmail: z.string().max(200),
  licenseNumber: z.string().max(100).optional(),
  hourlyLaborRate: z.number().min(1).max(1000),
  paintCostPerGallon: z.number().min(1).max(1000),
  wallCoverageSqFtPerGallon: z.number().min(50).max(2000),
  trimCoverageSqFtPerGallon: z.number().min(50).max(2000),
  defaultCoats: z.number().int().min(1).max(10),
  materialMarkupPercent: z.number().min(0).max(500),
  taxPercent: z.number().min(0).max(100),
  minimumJobCharge: z.number().min(0).max(100_000),
});

export { profileSettingsSchema };

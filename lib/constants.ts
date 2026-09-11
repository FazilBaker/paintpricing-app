import { CATALOG, paintCostPerGallon } from "@/lib/catalog";
import type { ExteriorTemplate, ExteriorTemplateKey, ProfileSettings, RoomTemplate, RoomTemplateKey } from "@/lib/types";

/**
 * Every pricing coefficient below is DERIVED from lib/catalog/catalog.json.
 * Do not reintroduce literals here. Edit the catalog, then run
 * `npm run build:catalog` so the marketing site's free calculator stays in sync.
 */

export const FREE_QUOTES_LIMIT = 3;
export const LIFETIME_DEAL_LIMIT = 50;
export const LIFETIME_DEAL_PRICE = 249;

export const DEFAULT_SETTINGS: ProfileSettings = {
  hourlyLaborRate: CATALOG.labor.defaultHourlyRate,
  paintCostPerGallon: paintCostPerGallon(),
  wallCoverageSqFtPerGallon: CATALOG.materials.wallCoverageSqFtPerGallon,
  trimCoverageSqFtPerGallon: CATALOG.materials.trimCoverageSqFtPerGallon,
  defaultCoats: CATALOG.materials.defaultCoats,
  materialMarkupPercent: CATALOG.pricing.materialMarkupPercent,
  taxPercent: CATALOG.pricing.defaultTaxPercent,
  minimumJobCharge: CATALOG.pricing.defaultMinimumJobCharge,
};

export const INDUSTRY_ASSUMPTIONS = {
  // Geometry
  doorDeductionSqFt: CATALOG.geometry.doorDeductionSqFt,
  windowDeductionSqFt: CATALOG.geometry.windowDeductionSqFt,
  trimPaintAreaPerLinearFoot: CATALOG.geometry.trimPaintAreaPerLinearFoot,

  // Production
  wallProductionSqFtPerHour: CATALOG.labor.wallProductionSqFtPerHour,
  ceilingProductionSqFtPerHour: CATALOG.labor.ceilingProductionSqFtPerHour,
  trimLinearFeetPerHour: CATALOG.labor.trimProductionLinearFtPerHour,

  // Doors and windows are billed per unit PER COAT. The previous
  // doorUnitsPerHour / windowUnitsPerHour figures implied 8 doors and 10 windows
  // an hour, which is not achievable with prep. See catalog/DIVERGENCES.md.
  hoursPerDoorPerCoat: CATALOG.labor.hoursPerDoorPerCoat,
  hoursPerWindowPerCoat: CATALOG.labor.hoursPerWindowPerCoat,

  // Prep and cleanup
  prepHoursPer100SqFt: CATALOG.prep.baseHoursPer100SqFt,
  exteriorPrepMultiplier: CATALOG.prep.exteriorMultiplier,
  heavyPrepMultiplier: CATALOG.prep.heavyPrepMultiplier,
  cleanupHoursPerQuote: CATALOG.labor.cleanupBaseHours,
  cleanupHoursPerItem: CATALOG.labor.cleanupHoursPerItem,

  // Supplies (was absent from the app entirely)
  suppliesBaseCharge: CATALOG.supplies.baseCharge,
  suppliesPerHundredSqFt: CATALOG.supplies.perHundredSqFt,
};

/**
 * FROZEN. Used only by the deprecated calculateQuoteSummary path, which
 * recomputes quotes that were saved before the catalog existed. These figures
 * are wrong (they imply 8 doors and 10 windows an hour) but changing them would
 * silently restate totals that painters have already sent to their clients.
 * New pricing must use INDUSTRY_ASSUMPTIONS above.
 */
export const LEGACY_ASSUMPTIONS = {
  doorUnitsPerHour: 8,
  windowUnitsPerHour: 10,
};

// ── Room templates ──────────────────────────────────────────
// Wall and ceiling areas are derived from the catalog's room dimensions rather
// than carried as separate allowances, so the app and the free calculator
// describe the same room.

type CatalogRoomKey = Exclude<RoomTemplateKey, "custom">;

function roomTemplateFrom(key: RoomTemplateKey): RoomTemplate {
  const preset = CATALOG.roomPresets[key];
  const { lengthFt: l, widthFt: w, heightFt: h } = preset;

  return {
    key,
    label: preset.label,
    defaultWallSqFt: Math.round(2 * (l + w) * h),
    defaultCeilingSqFt: Math.round(l * w),
    defaultTrimLinearFeet: preset.trimLinearFt,
    defaultDoorCount: preset.doors,
    defaultWindowCount: preset.windows,
    ceilingIncluded: preset.ceilingIncluded,
    note: preset.note,
    ...(preset.heavyTrim ? { heavyTrim: true } : {}),
    ...(preset.moistureFlag ? { moistureFlag: true } : {}),
  };
}

const CATALOG_ROOM_KEYS: CatalogRoomKey[] = [
  "living-room",
  "master-bedroom",
  "standard-bedroom",
  "kitchen",
  "bathroom",
  "hallway",
];

export const ROOM_TEMPLATES = Object.fromEntries(
  CATALOG_ROOM_KEYS.map((key) => [key, roomTemplateFrom(key)]),
) as Record<CatalogRoomKey, RoomTemplate>;

export const CUSTOM_TEMPLATE: RoomTemplate = roomTemplateFrom("custom");

// ── Exterior templates ──────────────────────────────────────

type CatalogExteriorKey = Exclude<ExteriorTemplateKey, "custom-exterior">;

function exteriorTemplateFrom(key: ExteriorTemplateKey): ExteriorTemplate {
  const surface = CATALOG.surfaces[key];

  return {
    key,
    label: surface.label,
    defaultSqFt: surface.defaultSqFt ?? 200,
    coverageSqFtPerGallon: surface.coverageSqFtPerGallon,
    productionSqFtPerHourBrush: surface.productionSqFtPerHourBrush ?? CATALOG.labor.wallProductionSqFtPerHour,
    productionSqFtPerHourSpray:
      surface.productionSqFtPerHourSpray ??
      (surface.productionSqFtPerHourBrush ?? CATALOG.labor.wallProductionSqFtPerHour) *
        CATALOG.labor.sprayMultiplier,
    defaultCoats: surface.defaultCoats,
    note: surface.note,
    ...(surface.isAddOn ? { isAddOn: true } : {}),
  };
}

const CATALOG_EXTERIOR_KEYS: CatalogExteriorKey[] = [
  "siding",
  "trim-fascia",
  "soffit",
  "doors",
  "garage-door",
  "shutters",
  "deck-porch",
  "fence",
];

export const EXTERIOR_TEMPLATES = Object.fromEntries(
  CATALOG_EXTERIOR_KEYS.map((key) => [key, exteriorTemplateFrom(key)]),
) as Record<CatalogExteriorKey, ExteriorTemplate>;

export const CUSTOM_EXTERIOR_TEMPLATE: ExteriorTemplate = exteriorTemplateFrom("custom-exterior");

// ── Shared ──────────────────────────────────────────────────

export const QUOTE_TERMS = CATALOG.quoteTerms;

export const BILLING_COPY = {
  monthlyPrice: 29,
  yearlyPrice: 279,
  yearlySavings: 69,
  lifetimePrice: LIFETIME_DEAL_PRICE,
  lifetimeSeats: LIFETIME_DEAL_LIMIT,
};

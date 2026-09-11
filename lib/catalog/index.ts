/**
 * Shared pricing catalog.
 *
 * This is the single source of truth for every coefficient used to price painting
 * work, consumed by both this app and the WordPress marketing site's free
 * calculator. Before this existed the two carried independent copies that had
 * drifted apart by up to 8x (see lib/catalog/DIVERGENCES.md).
 *
 * Rules:
 *  - Never hardcode a rate, coverage, production figure or multiplier elsewhere.
 *  - Edit catalog.json, not this file. This file only types and derives.
 *  - After editing catalog.json run `npm run build:catalog` to regenerate the
 *    theme's copy, or the two will drift again.
 */

import catalogJson from "./catalog.json";

// ── Types ─────────────────────────────────────────────────

export type PaintGradeKey = "economy" | "standard" | "premium";
export type ConditionKey = "good" | "fair" | "poor";
export type CostOfLivingKey = "high" | "medium" | "low";
export type SurfaceBasis = "area" | "linear" | "unit" | "system" | "prep" | "crewday" | "dft";
export type AccessTier = "ground" | "ladder" | "scaffold" | "lift" | "rope";
export type SurfaceScope = "interior" | "exterior";

export interface RoomPreset {
  label: string;
  /** Legacy or theme-side names that resolve to this entry. Never rename a key. */
  aliases: string[];
  lengthFt: number;
  widthFt: number;
  heightFt: number;
  trimLinearFt: number;
  doors: number;
  windows: number;
  ceilingIncluded: boolean;
  heavyTrim?: boolean;
  moistureFlag?: boolean;
  note: string;
}

export interface SurfaceDefinition {
  label: string;
  /** Legacy or theme-side names that resolve to this entry. Never rename a key. */
  aliases: string[];
  scope: SurfaceScope;
  basis: SurfaceBasis;
  coverageSqFtPerGallon: number;
  defaultCoats: number;
  access: AccessTier;
  note: string;
  source: string;
  defaultSqFt?: number;
  defaultLinearFt?: number;
  paintAreaPerLinearFoot?: number;
  paintAreaPerUnit?: number;
  hoursPerUnitPerCoat?: number;
  tier?: number;
  engineReady?: boolean;
  requires?: string;
  spec?: string[];
  measure?: { unit: string; label: string; default: number };
  production?: { brush?: number; spray?: number; unit: string };
  prep?: { profile: string; hoursPer100: number };
  system?: string[];
  productionSqFtPerHourBrush?: number;
  productionSqFtPerHourSpray?: number;
  productionLinearFtPerHourBrush?: number;
  productionLinearFtPerHourSpray?: number;
  isAddOn?: boolean;
}

export interface PricingCatalog {
  version: string;
  note: string;
  labor: {
    defaultHourlyRate: number;
    wallProductionSqFtPerHour: number;
    ceilingProductionSqFtPerHour: number;
    trimProductionLinearFtPerHour: number;
    hoursPerDoorPerCoat: number;
    hoursPerWindowPerCoat: number;
    cleanupBaseHours: number;
    cleanupHoursPerItem: number;
    sprayMultiplier: number;
  };
  prep: {
    baseHoursPer100SqFt: number;
    exteriorMultiplier: number;
    heavyPrepMultiplier: number;
    conditionMultiplier: Record<ConditionKey, number>;
  };
  materials: {
    paintGrades: Record<PaintGradeKey, { label: string; costPerGallon: number }>;
    defaultGrade: PaintGradeKey;
    wallCoverageSqFtPerGallon: number;
    trimCoverageSqFtPerGallon: number;
    defaultCoats: number;
    gallonRounding: number;
  };
  supplies: { baseCharge: number; perHundredSqFt: number };
  pricing: {
    materialMarkupPercent: number;
    defaultTaxPercent: number;
    defaultMinimumJobCharge: number;
    displayRange: { low: number; high: number };
    costOfLivingMultiplier: Record<CostOfLivingKey, number>;
  };
  geometry: {
    doorDeductionSqFt: number;
    windowDeductionSqFt: number;
    trimPaintAreaPerLinearFoot: number;
  };
  roomPresets: Record<string, RoomPreset>;
  surfaces: Record<string, SurfaceDefinition>;
  quoteTerms: string[];
}

export const CATALOG = catalogJson as unknown as PricingCatalog;

// ── Accessors ─────────────────────────────────────────────

/**
 * Catalog keys are canonical and are persisted inside saved quotes
 * (QuoteItem.templateKey), so they must never be renamed. These maps let the
 * theme's legacy names ("deck", "bedroom", "trim") resolve to the same entry.
 */
function buildAliasMap(entries: Record<string, { aliases?: string[] }>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const [key, entry] of Object.entries(entries)) {
    map[key] = key;
    for (const alias of entry.aliases ?? []) {
      map[alias] = key;
    }
  }
  return map;
}

const SURFACE_ALIASES = buildAliasMap(CATALOG.surfaces);
const ROOM_ALIASES = buildAliasMap(CATALOG.roomPresets);

/** Resolve any surface key or alias to its canonical key. */
export function resolveSurfaceKey(key: string): string | null {
  return SURFACE_ALIASES[key] ?? null;
}

/** Resolve any room key or alias to its canonical key. */
export function resolveRoomKey(key: string): string | null {
  return ROOM_ALIASES[key] ?? null;
}

export function getSurface(key: string): SurfaceDefinition | null {
  const canonical = resolveSurfaceKey(key);
  return canonical ? CATALOG.surfaces[canonical] : null;
}

export function getRoomPreset(key: string): RoomPreset | null {
  const canonical = resolveRoomKey(key);
  return canonical ? CATALOG.roomPresets[canonical] : null;
}

export function listSurfaces(scope?: SurfaceScope): Array<SurfaceDefinition & { key: string }> {
  return Object.entries(CATALOG.surfaces)
    .filter(([, s]) => !scope || s.scope === scope)
    .map(([key, s]) => ({ key, ...s }));
}

export function paintCostPerGallon(grade: PaintGradeKey = CATALOG.materials.defaultGrade): number {
  return CATALOG.materials.paintGrades[grade].costPerGallon;
}

/**
 * Production rate for a surface in its own basis unit (sq ft/hr for area
 * surfaces, linear ft/hr for linear ones). Falls back to the global spray
 * multiplier when a surface declares only a brush rate.
 */
export function productionRate(surface: SurfaceDefinition, useSpray: boolean): number {
  if (surface.basis === "linear") {
    const brush = surface.productionLinearFtPerHourBrush ?? CATALOG.labor.trimProductionLinearFtPerHour;
    if (!useSpray) return brush;
    return surface.productionLinearFtPerHourSpray ?? brush * CATALOG.labor.sprayMultiplier;
  }

  const brush = surface.productionSqFtPerHourBrush ?? CATALOG.labor.wallProductionSqFtPerHour;
  if (!useSpray) return brush;
  return surface.productionSqFtPerHourSpray ?? brush * CATALOG.labor.sprayMultiplier;
}

/** Supplies charge for a job of the given total painted area. */
export function suppliesCharge(totalSqFt: number): number {
  return CATALOG.supplies.baseCharge + (totalSqFt / 100) * CATALOG.supplies.perHundredSqFt;
}

/** Prep hours, before any heavy-prep uplift. */
export function prepHours(sqFt: number, condition: ConditionKey, scope: SurfaceScope): number {
  const base = (sqFt / 100) * CATALOG.prep.baseHoursPer100SqFt;
  const conditionAdjusted = base * CATALOG.prep.conditionMultiplier[condition];
  return scope === "exterior" ? conditionAdjusted * CATALOG.prep.exteriorMultiplier : conditionAdjusted;
}

/** Round gallons up to the nearest quarter, matching how paint is actually bought. */
export function roundGallons(raw: number): number {
  const step = CATALOG.materials.gallonRounding;
  return Math.ceil(raw / step) * step;
}

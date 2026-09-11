/**
 * Basis-aware surface pricing (P2).
 *
 * The original engine could price exactly one thing: area divided by a
 * production rate. That is correct for walls and siding and wrong for
 * everything measured another way. Cabinets are priced per door front,
 * baseboard by the foot, parking stalls by the stall.
 *
 * This module prices a surface according to the basis it declares in the
 * catalog, so adding a new job type is a catalog entry rather than new code.
 *
 * Every coefficient comes from lib/catalog/catalog.json. Nothing is hardcoded.
 */

import {
  CATALOG,
  getSurface,
  paintCostPerGallon,
  roundGallons,
  type ConditionKey,
  type PaintGradeKey,
  type SurfaceDefinition,
} from "@/lib/catalog";

export interface SurfaceQuoteInputs {
  /** How much of it: square feet, linear feet, or a unit count, per the basis. */
  quantity: number;
  coats?: number;
  useSpray?: boolean;
  condition?: ConditionKey;
  heavyPrep?: boolean;
  includePrimer?: boolean;
  paintGrade?: PaintGradeKey;
}

export interface SurfaceQuoteSettings {
  hourlyLaborRate: number;
  materialMarkupPercent: number;
  /**
   * Applied to a SINGLE surface. The app passes 0 here on purpose: a quote's minimum is applied
   * once to the whole quote in calculateQuoteSummary, and flooring every line at the minimum
   * would price a five room job at five times it. Standalone callers (the marketing
   * calculators) do want the floor, which is why it stays configurable.
   */
  minimumJobCharge: number;
  /**
   * The painter's own paint cost, overriding the catalog grade price. Painters set this in
   * settings and ignoring it would silently price their jobs with someone else's material cost.
   */
  paintCostPerGallon?: number;
}

export interface SurfaceQuote {
  surfaceKey: string;
  label: string;
  basis: string;
  /** What the visitor entered, with its unit, for display. */
  measured: { quantity: number; unit: string };
  paintedAreaSqFt: number;
  coats: number;
  gallons: number;
  laborHours: { application: number; prep: number; cleanup: number; total: number };
  cost: { materials: number; materialsSold: number; supplies: number; labor: number };
  subtotal: number;
  minimumApplied: boolean;
  total: number;
  range: { low: number; high: number };
  scopeDescription: string;
}

export const DEFAULT_SURFACE_SETTINGS: SurfaceQuoteSettings = {
  hourlyLaborRate: CATALOG.labor.defaultHourlyRate,
  materialMarkupPercent: CATALOG.pricing.materialMarkupPercent,
  minimumJobCharge: CATALOG.pricing.defaultMinimumJobCharge,
};

/**
 * Painted area for a quantity of this surface, in square feet.
 *
 * This is the bridge between the basis and the materials calculation: paint is
 * always bought by area, whatever the work is measured in.
 */
export function paintedArea(surface: SurfaceDefinition, quantity: number): number {
  switch (surface.basis) {
    case "linear":
      return quantity * (surface.paintAreaPerLinearFoot ?? CATALOG.geometry.trimPaintAreaPerLinearFoot);
    case "unit":
      return quantity * (surface.paintAreaPerUnit ?? 0);
    default:
      return quantity;
  }
}

/**
 * Application hours, before prep and cleanup.
 *
 * Unit surfaces price by hours per item per coat, because a six panel door does
 * not get faster just because it is small. Area and linear surfaces divide by a
 * production rate in their own unit.
 */
export function applicationHours(
  surface: SurfaceDefinition,
  quantity: number,
  coats: number,
  useSpray: boolean,
): number {
  if (surface.basis === "unit") {
    return quantity * coats * (surface.hoursPerUnitPerCoat ?? 0);
  }

  const prod = surface.production;
  const brush = prod?.brush ?? CATALOG.labor.wallProductionSqFtPerHour;
  const rate = useSpray ? prod?.spray ?? brush * CATALOG.labor.sprayMultiplier : brush;

  // Linear rates are already lin ft/hr, so quantity is used directly.
  return (quantity * coats) / rate;
}

function prepHoursFor(
  surface: SurfaceDefinition,
  areaSqFt: number,
  condition: ConditionKey,
  heavyPrep: boolean,
): number {
  const perHundred = surface.prep?.hoursPer100 ?? CATALOG.prep.baseHoursPer100SqFt;
  let hours = (areaSqFt / 100) * perHundred * CATALOG.prep.conditionMultiplier[condition];
  if (surface.scope === "exterior") hours *= CATALOG.prep.exteriorMultiplier;
  if (heavyPrep) hours *= CATALOG.prep.heavyPrepMultiplier;
  return hours;
}

export function priceSurface(
  surfaceKey: string,
  inputs: SurfaceQuoteInputs,
  settings: SurfaceQuoteSettings = DEFAULT_SURFACE_SETTINGS,
): SurfaceQuote {
  const surface = getSurface(surfaceKey);
  if (!surface) {
    throw new Error(`Unknown surface "${surfaceKey}". Add it to catalog.json.`);
  }

  const quantity = Math.max(0, inputs.quantity);
  const baseCoats = inputs.coats ?? surface.defaultCoats;
  const coats = baseCoats + (inputs.includePrimer ? 1 : 0);
  const useSpray = inputs.useSpray ?? false;
  const condition: ConditionKey = inputs.condition ?? "fair";

  const area = paintedArea(surface, quantity);
  const gallons = roundGallons((area * coats) / surface.coverageSqFtPerGallon);

  const application = applicationHours(surface, quantity, coats, useSpray);
  const prep = prepHoursFor(surface, area, condition, inputs.heavyPrep ?? false);
  const cleanup = CATALOG.labor.cleanupBaseHours + CATALOG.labor.cleanupHoursPerItem;
  const totalHours = application + prep + cleanup;

  const materials =
    gallons * (settings.paintCostPerGallon ?? paintCostPerGallon(inputs.paintGrade));
  const materialsSold = materials * (1 + settings.materialMarkupPercent / 100);
  const supplies = CATALOG.supplies.baseCharge + (area / 100) * CATALOG.supplies.perHundredSqFt;
  const labor = totalHours * settings.hourlyLaborRate;

  const subtotal = materialsSold + supplies + labor;
  const total = Math.max(subtotal, settings.minimumJobCharge);

  return {
    surfaceKey,
    label: surface.label,
    basis: surface.basis,
    measured: { quantity, unit: surface.measure?.unit ?? "sq ft" },
    paintedAreaSqFt: area,
    coats,
    gallons,
    laborHours: { application, prep, cleanup, total: totalHours },
    cost: { materials, materialsSold, supplies, labor },
    subtotal,
    minimumApplied: total > subtotal,
    total,
    range: {
      low: total * CATALOG.pricing.displayRange.low,
      high: total * CATALOG.pricing.displayRange.high,
    },
    scopeDescription: describeScope(surface, quantity, coats, useSpray, inputs),
  };
}

function describeScope(
  surface: SurfaceDefinition,
  quantity: number,
  coats: number,
  useSpray: boolean,
  inputs: SurfaceQuoteInputs,
): string {
  const unit = surface.measure?.unit ?? "sq ft";
  const parts = [`${Math.round(quantity)} ${unit}`];
  parts.push(useSpray ? "spray application" : "brush and roll");
  if (inputs.includePrimer) parts.push("primer plus finish");
  if (inputs.heavyPrep) parts.push("heavy prep");
  if (inputs.condition && inputs.condition !== "fair") parts.push(`${inputs.condition} condition`);
  return `${surface.label}: ${parts.join(", ")}. ${coats} coats.`;
}

/** Surfaces the engine can price today, for building calculator pages from. */
export function priceableSurfaces(): Array<SurfaceDefinition & { key: string }> {
  return Object.entries(CATALOG.surfaces)
    .filter(([, s]) => ["area", "linear", "unit"].includes(s.basis))
    .map(([key, s]) => ({ key, ...s }));
}

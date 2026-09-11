/**
 * Cost stack maths (P3).
 *
 * Layers 1 to 3 (materials, sundries, direct labor) answer what a job will
 * consume. Layers 4 to 7 answer what to charge for it, and they are what the
 * engine was missing:
 *
 *   L4 labor burden          payroll tax, comp, insurance, PTO, vehicle
 *   L5 equipment and access  lifts, scaffold, sprayers, priced by the day
 *   L6 mobilization          drive time, load in and out, per job
 *   L7 overhead and margin   recovered across the whole price, not on paint
 *
 * The single most expensive arithmetic error in the trade is treating markup
 * and margin as the same thing. A 40 percent markup is a 28.6 percent margin.
 * Every function here keeps them distinct and says which it means.
 */

import { CATALOG } from "@/lib/catalog";

const CS = (CATALOG as unknown as { costStack: CostStackConfig }).costStack;

export interface CostStackConfig {
  laborBurden: { percentOnWage: number; components: Record<string, number> };
  overhead: { recoveryPercent: number };
  profit: { targetNetMarginPercent: number };
  mobilization: { baseCharge: number; perMileRate: number; defaultRoundTripMiles: number };
  equipmentDayRates: Record<string, number>;
  accessMultiplier: Record<string, number>;
}

export const COST_STACK = CS;

// ── L4: labor burden ──────────────────────────────────────

/**
 * True hourly cost of an employee, wage plus burden.
 * A $25 wage at 32% burden costs $33 an hour to put on site.
 */
export function loadedLaborRate(baseWage: number, burdenPercent = CS.laborBurden.percentOnWage): number {
  return baseWage * (1 + burdenPercent / 100);
}

/** What the burden percentage actually consists of, for showing the working. */
export function burdenBreakdown(baseWage: number, burdenPercent = CS.laborBurden.percentOnWage) {
  const components = Object.entries(CS.laborBurden.components).map(([key, pct]) => ({
    key,
    percent: pct,
    dollars: baseWage * (pct / 100),
  }));
  return {
    baseWage,
    burdenPercent,
    burdenDollars: baseWage * (burdenPercent / 100),
    loadedRate: loadedLaborRate(baseWage, burdenPercent),
    components,
  };
}

// ── Markup and margin ─────────────────────────────────────

/** Margin is a share of PRICE. Markup is a share of COST. They are not equal. */
export function marginToMarkup(marginPercent: number): number {
  if (marginPercent >= 100) throw new Error("Margin must be below 100 percent.");
  return (marginPercent / (100 - marginPercent)) * 100;
}

export function markupToMargin(markupPercent: number): number {
  return (markupPercent / (100 + markupPercent)) * 100;
}

/** Price that achieves a target margin. Divide by one minus the margin. */
export function priceForMargin(cost: number, marginPercent: number): number {
  if (marginPercent >= 100) throw new Error("Margin must be below 100 percent.");
  return cost / (1 - marginPercent / 100);
}

/** Price from a markup. Multiply. This is the one people reach for by mistake. */
export function priceForMarkup(cost: number, markupPercent: number): number {
  return cost * (1 + markupPercent / 100);
}

export function marginOf(cost: number, price: number): number {
  if (price <= 0) return 0;
  return ((price - cost) / price) * 100;
}

// ── L5 and L6: equipment, access, mobilization ────────────

export function equipmentCost(items: Array<{ key: string; days: number }>): number {
  return items.reduce((sum, item) => sum + (CS.equipmentDayRates[item.key] ?? 0) * item.days, 0);
}

/** Height and access slow production. Applied to hours, never to materials. */
export function accessMultiplier(tier: string): number {
  return CS.accessMultiplier[tier] ?? 1;
}

export function mobilizationCost(
  roundTripMiles = CS.mobilization.defaultRoundTripMiles,
  trips = 1,
): number {
  return (CS.mobilization.baseCharge + roundTripMiles * CS.mobilization.perMileRate) * trips;
}

// ── L7: the full stack ────────────────────────────────────

export interface FullPriceInputs {
  materialCost: number;
  laborHours: number;
  baseWage: number;
  burdenPercent?: number;
  overheadPercent?: number;
  targetMarginPercent?: number;
  equipment?: Array<{ key: string; days: number }>;
  roundTripMiles?: number;
  trips?: number;
  accessTier?: string;
}

export interface FullPriceResult {
  directLabor: number;
  burden: number;
  materials: number;
  equipment: number;
  mobilization: number;
  totalDirectCost: number;
  overheadRecovered: number;
  totalCost: number;
  profit: number;
  price: number;
  effectiveMarginPercent: number;
  equivalentMarkupPercent: number;
  breakdown: Array<{ layer: string; label: string; amount: number }>;
}

/**
 * The whole stack, from consumption to a defensible price.
 *
 * Overhead and profit are applied to the TOTAL cost, which is the correction
 * this phase exists to make. The previous model recovered overhead by marking
 * up paint, the smallest line in the job.
 */
export function fullPrice(inputs: FullPriceInputs): FullPriceResult {
  const burdenPercent = inputs.burdenPercent ?? CS.laborBurden.percentOnWage;
  const overheadPercent = inputs.overheadPercent ?? CS.overhead.recoveryPercent;
  const marginPercent = inputs.targetMarginPercent ?? CS.profit.targetNetMarginPercent;

  const hours = inputs.laborHours * accessMultiplier(inputs.accessTier ?? "ground");
  const directLabor = hours * inputs.baseWage;
  const burden = directLabor * (burdenPercent / 100);
  const equipment = equipmentCost(inputs.equipment ?? []);
  const mobilization = mobilizationCost(inputs.roundTripMiles, inputs.trips);

  const totalDirectCost = inputs.materialCost + directLabor + burden + equipment + mobilization;

  // Overhead is a share of revenue, so recovering it needs the same divide-by
  // treatment as margin. Adding overheadPercent of COST under-recovers it.
  const costPlusOverhead = totalDirectCost / (1 - overheadPercent / 100);
  const overheadRecovered = costPlusOverhead - totalDirectCost;

  const price = priceForMargin(costPlusOverhead, marginPercent);
  const profit = price - costPlusOverhead;

  return {
    directLabor,
    burden,
    materials: inputs.materialCost,
    equipment,
    mobilization,
    totalDirectCost,
    overheadRecovered,
    totalCost: costPlusOverhead,
    profit,
    price,
    effectiveMarginPercent: marginOf(totalDirectCost, price),
    equivalentMarkupPercent: ((price - totalDirectCost) / totalDirectCost) * 100,
    breakdown: [
      { layer: "L1", label: "Materials", amount: inputs.materialCost },
      { layer: "L3", label: "Direct labor", amount: directLabor },
      { layer: "L4", label: "Labor burden", amount: burden },
      { layer: "L5", label: "Equipment", amount: equipment },
      { layer: "L6", label: "Mobilization", amount: mobilization },
      { layer: "L7", label: "Overhead recovery", amount: overheadRecovered },
      { layer: "L7", label: "Profit", amount: profit },
    ],
  };
}

// ── Business calculators ──────────────────────────────────

/** Revenue needed to cover fixed overhead at a given gross margin. */
export function breakEvenRevenue(annualOverhead: number, grossMarginPercent: number): number {
  if (grossMarginPercent <= 0) throw new Error("Gross margin must be above zero.");
  return annualOverhead / (grossMarginPercent / 100);
}

/** Overhead each billable hour has to carry. */
export function overheadPerBillableHour(annualOverhead: number, billableHoursPerYear: number): number {
  if (billableHoursPerYear <= 0) return 0;
  return annualOverhead / billableHoursPerYear;
}

/**
 * The smallest job worth taking.
 *
 * Setup, travel and cleanup do not scale down, so a short job still consumes
 * most of a visit. This is what a minimum charge should actually be based on.
 */
export function minimumProfitableJob(
  fixedVisitHours: number,
  loadedRate: number,
  overheadPercent = CS.overhead.recoveryPercent,
  marginPercent = CS.profit.targetNetMarginPercent,
): number {
  const cost = fixedVisitHours * loadedRate + mobilizationCost();
  return priceForMargin(cost / (1 - overheadPercent / 100), marginPercent);
}

/** Square feet an hour, from a completed job. Feeds better future estimates. */
export function productionRate(areaSqFt: number, hours: number): number {
  return hours > 0 ? areaSqFt / hours : 0;
}

/** What a crew costs for a day, fully loaded. */
export function crewDayCost(
  crewSize: number,
  hoursPerDay: number,
  baseWage: number,
  burdenPercent = CS.laborBurden.percentOnWage,
): number {
  return crewSize * hoursPerDay * loadedLaborRate(baseWage, burdenPercent);
}

/** Whether a finished job actually made money. */
export function jobProfitability(revenue: number, materialCost: number, laborHours: number, loadedRate: number) {
  const labor = laborHours * loadedRate;
  const directCost = materialCost + labor;
  const grossProfit = revenue - directCost;
  return {
    revenue,
    materialCost,
    laborCost: labor,
    directCost,
    grossProfit,
    grossMarginPercent: marginOf(directCost, revenue),
    profitPerHour: laborHours > 0 ? grossProfit / laborHours : 0,
  };
}

/** What a discount really costs, expressed in the extra revenue needed. */
export function discountImpact(price: number, discountPercent: number, grossMarginPercent: number) {
  const discounted = price * (1 - discountPercent / 100);
  const originalProfit = price * (grossMarginPercent / 100);
  const cost = price - originalProfit;
  const newProfit = discounted - cost;
  const profitLostPercent = originalProfit > 0 ? ((originalProfit - newProfit) / originalProfit) * 100 : 0;
  return {
    originalPrice: price,
    discountedPrice: discounted,
    originalProfit,
    newProfit,
    profitLostPercent,
    extraRevenueNeeded: newProfit > 0 ? (originalProfit / newProfit) * discounted - discounted : Infinity,
  };
}

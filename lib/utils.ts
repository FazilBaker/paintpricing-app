import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value);
}

export function roundQuarterUp(value: number) {
  return Math.ceil(value * 4) / 4;
}

export function toNullableNumber(value: FormDataEntryValue | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function safeRedirect(target: string | null | undefined, fallback: string) {
  if (!target) {
    return fallback;
  }

  // Must be a relative path starting with a single "/" — block:
  //   - absolute URLs (http://, https://, javascript:, etc.)
  //   - protocol-relative URLs (//evil.com)
  //   - empty / whitespace strings
  const trimmed = target.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\")
  ) {
    return fallback;
  }

  return trimmed;
}

export function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateString));
}

/**
 * The once-per-job setup and cleanup charge that sits inside `subtotal`.
 *
 * Until 2026-09-30 this amount was added to the subtotal of every item-based quote and rendered
 * nowhere, because `calculateItemsSummary` also zeroes `laborTotal` and `materialsTotal`, which
 * are the rows the quote uses to explain the subtotal. The line items therefore did not add up to
 * the subtotal on any quote a customer received.
 *
 * Quotes saved before that date have no `baseCleanup` field, so derive it: the gap between the
 * item prices and the subtotal BEFORE the minimum is exactly the cleanup charge. The minimum job
 * top-up is a different thing and is reported separately by `minimumApplied`, so it must not be
 * folded in here.
 */
export function resolveBaseCleanup(summary: {
  baseCleanup?: number;
  items?: { price: number }[];
  subtotal: number;
  subtotalBeforeMinimum?: number;
}): number {
  if (typeof summary.baseCleanup === "number") return summary.baseCleanup;
  const items = summary.items ?? [];
  if (items.length === 0) return 0;
  const itemsTotal = items.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const base = summary.subtotalBeforeMinimum ?? summary.subtotal;
  const gap = base - itemsTotal;
  // Guard against float dust and against legacy shapes where the gap is meaningless.
  return gap > 0.005 ? gap : 0;
}

/** The amount the minimum job charge added, if it was applied. */
export function resolveMinimumTopUp(summary: {
  subtotal: number;
  subtotalBeforeMinimum?: number;
  minimumApplied?: boolean;
}): number {
  if (!summary.minimumApplied) return 0;
  const base = summary.subtotalBeforeMinimum;
  if (typeof base !== "number") return 0;
  const gap = summary.subtotal - base;
  return gap > 0.005 ? gap : 0;
}

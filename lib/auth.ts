import { redirect } from "next/navigation";

import { DEFAULT_SETTINGS, FREE_QUOTES_LIMIT } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BillingStatus, ProfileRecord } from "@/lib/types";

const ACTIVE_STATUSES: BillingStatus[] = ["active"];

function normalizeProfile(record: Record<string, unknown>): ProfileRecord {
  return {
    id: String(record.id),
    businessName: (record.business_name as string | null) ?? null,
    phone: (record.phone as string | null) ?? null,
    businessEmail: (record.business_email as string | null) ?? null,
    licenseNumber: (record.license_number as string | null) ?? null,
    logoUrl: (record.logo_url as string | null) ?? null,
    billingStatus: ((record.billing_status as BillingStatus | null) ?? "inactive"),
    billingCycle:
      ((record.billing_cycle as "monthly" | "yearly" | null) ?? null),
    paypalSubscriptionId:
      (record.paypal_subscription_id as string | null) ?? null,
    paypalPayerId: (record.paypal_payer_id as string | null) ?? null,
    guaranteeEligibleUntil:
      (record.guarantee_eligible_until as string | null) ?? null,
    refundUsedAt: (record.refund_used_at as string | null) ?? null,
    ratesConfiguredAt: (record.rates_configured_at as string | null) ?? null,
    freeQuotesUsed: Number(record.free_quotes_used ?? 0),
    freeQuotesLimit: Number(record.free_quotes_limit ?? FREE_QUOTES_LIMIT),
    lifetimeDealClaimedAt:
      (record.lifetime_deal_claimed_at as string | null) ?? null,
    settings: {
      hourlyLaborRate:
        Number(record.hourly_labor_rate ?? DEFAULT_SETTINGS.hourlyLaborRate),
      paintCostPerGallon:
        Number(record.paint_cost_per_gallon ?? DEFAULT_SETTINGS.paintCostPerGallon),
      wallCoverageSqFtPerGallon: Number(
        record.wall_coverage_sq_ft_per_gallon ??
          DEFAULT_SETTINGS.wallCoverageSqFtPerGallon,
      ),
      trimCoverageSqFtPerGallon: Number(
        record.trim_coverage_sq_ft_per_gallon ??
          DEFAULT_SETTINGS.trimCoverageSqFtPerGallon,
      ),
      defaultCoats: Number(record.default_coats ?? DEFAULT_SETTINGS.defaultCoats),
      materialMarkupPercent: Number(
        record.material_markup_percent ?? DEFAULT_SETTINGS.materialMarkupPercent,
      ),
      taxPercent: Number(record.tax_percent ?? DEFAULT_SETTINGS.taxPercent),
      minimumJobCharge: Number(
        record.minimum_job_charge ?? DEFAULT_SETTINGS.minimumJobCharge,
      ),
    },
  };
}

async function ensureProfile(userId: string) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }

  const existing = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (existing.data) {
    return normalizeProfile(existing.data as Record<string, unknown>);
  }

  const inserted = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      hourly_labor_rate: DEFAULT_SETTINGS.hourlyLaborRate,
      paint_cost_per_gallon: DEFAULT_SETTINGS.paintCostPerGallon,
      wall_coverage_sq_ft_per_gallon: DEFAULT_SETTINGS.wallCoverageSqFtPerGallon,
      trim_coverage_sq_ft_per_gallon: DEFAULT_SETTINGS.trimCoverageSqFtPerGallon,
      default_coats: DEFAULT_SETTINGS.defaultCoats,
      material_markup_percent: DEFAULT_SETTINGS.materialMarkupPercent,
      tax_percent: DEFAULT_SETTINGS.taxPercent,
      minimum_job_charge: DEFAULT_SETTINGS.minimumJobCharge,
      free_quotes_used: 0,
      free_quotes_limit: FREE_QUOTES_LIMIT,
    })
    .select("*")
    .single();

  if (!inserted.data) {
    return null;
  }

  return normalizeProfile(inserted.data as Record<string, unknown>);
}

export async function getViewer() {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      user: null,
      profile: null,
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      configured: false,
      user: null,
      profile: null,
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      configured: true,
      user: null,
      profile: null,
    };
  }

  const profile = await ensureProfile(user.id);

  return {
    configured: true,
    user,
    profile,
  };
}

export async function requireViewer() {
  const viewer = await getViewer();

  if (!viewer.configured) {
    return viewer;
  }

  if (!viewer.user) {
    redirect("/login");
  }

  return viewer;
}

export function hasConfiguredRates(profile: ProfileRecord | null) {
  return Boolean(profile?.ratesConfiguredAt);
}

export function hasPaidAccess(profile: ProfileRecord | null) {
  return Boolean(profile && ACTIVE_STATUSES.includes(profile.billingStatus));
}

export function quotesRemaining(profile: ProfileRecord | null) {
  if (!profile) {
    return FREE_QUOTES_LIMIT;
  }

  if (hasPaidAccess(profile)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(profile.freeQuotesLimit - profile.freeQuotesUsed, 0);
}

export function canCreateQuote(profile: ProfileRecord | null) {
  if (!profile) {
    return false;
  }

  if (hasPaidAccess(profile)) {
    return true;
  }

  return profile.freeQuotesUsed < profile.freeQuotesLimit;
}

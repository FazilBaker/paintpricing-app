"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DEFAULT_SETTINGS, FREE_QUOTES_LIMIT } from "@/lib/constants";
import { getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { calculateQuoteSummary } from "@/lib/quote-engine";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuoteDraftPayload } from "@/lib/types";
import { safeRedirect, toNullableNumber } from "@/lib/utils";
import { profileSetupSchema, quoteDraftPayloadSchema } from "@/lib/validation";

function generateShareToken(): string {
  const chars = "abcdefghijkmnpqrstuvwxyz23456789"; // no ambiguous chars (0,o,1,l)
  let token = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const byte of bytes) {
    token += chars[byte % chars.length];
  }
  return token;
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function signUpAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithError("/signup", "Add your Supabase keys to start testing auth.");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = safeRedirect(
    String(formData.get("redirectTo") ?? "/dashboard"),
    "/dashboard",
  );
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError("/signup", "Supabase is not configured.");
  }

  const { error, data } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirectWithError("/signup", error.message);
  }

  if (!data.session) {
    // Email confirmation is enabled — redirect to a success state
    redirect("/signup?confirm=true");
  }

  redirect(redirectTo);
}

export async function signInAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithError("/login", "Add your Supabase keys to start testing auth.");
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const redirectTo = safeRedirect(
    String(formData.get("redirectTo") ?? "/dashboard"),
    "/dashboard",
  );
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirectWithError("/login", "Supabase is not configured.");
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirectWithError("/login", error.message);
  }

  redirect(redirectTo);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/");
}

export async function saveProfileSetupAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/onboarding", "Supabase is not configured.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const logo = formData.get("logo");
  let logoUrl: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    const extension = logo.name.split(".").pop() || "png";
    const path = `${user.id}/logo-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from("logos").upload(path, logo, {
      contentType: logo.type,
      upsert: true,
    });

    if (upload.error) {
      redirectWithError("/onboarding", "Logo upload failed. Please try a smaller image.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(path);
    logoUrl = publicUrl;
  }

  const rawInput = {
    businessName: String(formData.get("businessName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    businessEmail: String(formData.get("businessEmail") ?? "").trim(),
    licenseNumber: String(formData.get("licenseNumber") ?? "").trim() || undefined,
    hourlyLaborRate:
      toNullableNumber(formData.get("hourlyLaborRate")) ??
      DEFAULT_SETTINGS.hourlyLaborRate,
    paintCostPerGallon:
      toNullableNumber(formData.get("paintCostPerGallon")) ??
      DEFAULT_SETTINGS.paintCostPerGallon,
    wallCoverageSqFtPerGallon:
      toNullableNumber(formData.get("wallCoverageSqFtPerGallon")) ??
      DEFAULT_SETTINGS.wallCoverageSqFtPerGallon,
    trimCoverageSqFtPerGallon:
      toNullableNumber(formData.get("trimCoverageSqFtPerGallon")) ??
      DEFAULT_SETTINGS.trimCoverageSqFtPerGallon,
    defaultCoats:
      toNullableNumber(formData.get("defaultCoats")) ?? DEFAULT_SETTINGS.defaultCoats,
    materialMarkupPercent:
      toNullableNumber(formData.get("materialMarkupPercent")) ??
      DEFAULT_SETTINGS.materialMarkupPercent,
    taxPercent:
      toNullableNumber(formData.get("taxPercent")) ?? DEFAULT_SETTINGS.taxPercent,
    minimumJobCharge:
      toNullableNumber(formData.get("minimumJobCharge")) ??
      DEFAULT_SETTINGS.minimumJobCharge,
  };

  const validated = profileSetupSchema.safeParse(rawInput);
  if (!validated.success) {
    const firstError = validated.error.issues[0]?.message ?? "Invalid input.";
    redirectWithError("/onboarding", firstError);
  }

  const input = validated.data;

  const payload = {
    id: user.id,
    business_name: input.businessName,
    phone: input.phone,
    business_email: input.businessEmail,
    license_number: input.licenseNumber ?? null,
    hourly_labor_rate: input.hourlyLaborRate,
    paint_cost_per_gallon: input.paintCostPerGallon,
    wall_coverage_sq_ft_per_gallon: input.wallCoverageSqFtPerGallon,
    trim_coverage_sq_ft_per_gallon: input.trimCoverageSqFtPerGallon,
    default_coats: input.defaultCoats,
    material_markup_percent: input.materialMarkupPercent,
    tax_percent: input.taxPercent,
    minimum_job_charge: input.minimumJobCharge,
    free_quotes_used: 0,
    free_quotes_limit: FREE_QUOTES_LIMIT,
    rates_configured_at: new Date().toISOString(),
  } as Record<string, unknown>;

  if (logoUrl) {
    payload.logo_url = logoUrl;
  }

  const { error } = await supabase.from("profiles").upsert(payload);

  if (error) {
    redirectWithError("/onboarding", error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function createQuoteAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.user || !viewer.profile) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/quotes/new", "Supabase is not configured.");
  }

  const rawPayload = String(formData.get("payload") ?? "");
  if (!rawPayload) {
    redirectWithError("/quotes/new", "Quote payload is missing.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    redirectWithError("/quotes/new", "Invalid quote data.");
  }

  const validated = quoteDraftPayloadSchema.safeParse(parsed);
  if (!validated.success) {
    redirectWithError("/quotes/new", "Invalid quote data. Please check your inputs.");
  }

  const payload = validated.data as QuoteDraftPayload;

  // Recalculate totals server-side so clients can't fake amounts
  if (payload.items && payload.items.length > 0) {
    // New item-based quotes — server recalculates from item prices
    const { calculateItemsSummary } = await import("@/lib/quote-engine");
    const serverSummary = calculateItemsSummary(
      payload.items,
      viewer.profile.settings,
      payload.discount ?? { type: "flat", value: 0 },
    );
    payload.summary = serverSummary;
  } else {
    // Legacy room-based quotes
    const serverSummary = calculateQuoteSummary(
      payload.rooms,
      viewer.profile.settings,
      payload.exteriorItems ?? [],
    );
    payload.summary = serverSummary;
  }

  // Handle versioning: if editing an existing quote, link to parent and mark old as not latest
  let parentQuoteId = String(formData.get("parentQuoteId") ?? "").trim() || null;
  let version = 1;

  if (parentQuoteId) {
    // Verify the parent quote belongs to this user
    const { data: parentQuote } = await supabase
      .from("quotes")
      .select("id, version")
      .eq("id", parentQuoteId)
      .eq("user_id", viewer.user.id)
      .single();

    if (!parentQuote) {
      // Invalid parent — treat as a new quote
      parentQuoteId = null;
    } else {
      version = Math.max(2, Number(formData.get("version") ?? (parentQuote.version ?? 1) + 1));
    }
  }

  // Paid users get auto-unlocked quotes; free users must spend a credit to unlock
  const isPaid = viewer.profile.billingStatus === "active";

  const insertPayload: Record<string, unknown> = {
    user_id: viewer.user.id,
    client_name: payload.client.customerName,
    project_address: payload.client.projectAddress,
    total: payload.summary.grandTotal,
    tax_total: payload.summary.taxTotal,
    labor_total: payload.summary.laborTotal,
    materials_total: payload.summary.materialsTotal,
    quote_data: payload,
    version,
    parent_quote_id: parentQuoteId,
    is_latest: true,
    share_token: generateShareToken(),
    is_unlocked: isPaid,
  };

  const { data, error } = await supabase
    .from("quotes")
    .insert(insertPayload)
    .select("id")
    .single();

  const quoteId = data?.id;

  if (error || !quoteId) {
    redirectWithError("/quotes/new", error?.message ?? "Unable to save quote.");
  }

  // Mark the previous version as not latest
  if (parentQuoteId) {
    await supabase
      .from("quotes")
      .update({ is_latest: false })
      .eq("id", parentQuoteId)
      .eq("user_id", viewer.user.id);
  }

  await supabase
    .from("quotes")
    .update({
      pdf_url: `/api/quotes/${quoteId}/pdf`,
    })
    .eq("id", quoteId);

  revalidatePath("/dashboard");
  redirect(`/quotes/${quoteId}`);
}

export async function forgotPasswordAction(formData: FormData) {
  if (!isSupabaseConfigured()) {
    redirectWithError("/forgot-password", "Supabase is not configured.");
  }

  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirectWithError("/forgot-password", "Please enter your email.");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/forgot-password", "Supabase is not configured.");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://app.paintpricing.com";

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
  });

  if (error) {
    redirectWithError("/forgot-password", error.message);
  }

  redirect("/forgot-password?success=true");
}

export async function resetPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

  if (password !== confirmPassword) {
    redirectWithError("/reset-password", "Passwords do not match.");
  }

  if (password.length < 8) {
    redirectWithError("/reset-password", "Password must be at least 8 characters.");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/reset-password", "Supabase is not configured.");
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirectWithError("/reset-password", error.message);
  }

  redirect("/dashboard");
}

export async function updateProfileAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/settings", "Supabase is not configured.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Parse custom fields from JSON hidden input
  let customFields: Array<{ id: string; label: string; value: string }> = [];
  try {
    const raw = String(formData.get("customFields") ?? "[]");
    customFields = JSON.parse(raw);
  } catch {
    customFields = [];
  }

  const rawInput = {
    businessName: String(formData.get("businessName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    businessEmail: String(formData.get("businessEmail") ?? "").trim(),
    licenseNumber: String(formData.get("licenseNumber") ?? "").trim() || undefined,
    hourlyLaborRate:
      toNullableNumber(formData.get("hourlyLaborRate")) ??
      DEFAULT_SETTINGS.hourlyLaborRate,
    paintCostPerGallon:
      toNullableNumber(formData.get("paintCostPerGallon")) ??
      DEFAULT_SETTINGS.paintCostPerGallon,
    wallCoverageSqFtPerGallon:
      toNullableNumber(formData.get("wallCoverageSqFtPerGallon")) ??
      DEFAULT_SETTINGS.wallCoverageSqFtPerGallon,
    trimCoverageSqFtPerGallon:
      toNullableNumber(formData.get("trimCoverageSqFtPerGallon")) ??
      DEFAULT_SETTINGS.trimCoverageSqFtPerGallon,
    defaultCoats:
      toNullableNumber(formData.get("defaultCoats")) ?? DEFAULT_SETTINGS.defaultCoats,
    materialMarkupPercent:
      toNullableNumber(formData.get("materialMarkupPercent")) ??
      DEFAULT_SETTINGS.materialMarkupPercent,
    taxPercent:
      toNullableNumber(formData.get("taxPercent")) ?? DEFAULT_SETTINGS.taxPercent,
    minimumJobCharge:
      toNullableNumber(formData.get("minimumJobCharge")) ??
      DEFAULT_SETTINGS.minimumJobCharge,
  };

  const validated = profileSetupSchema.safeParse(rawInput);
  if (!validated.success) {
    const firstError = validated.error.issues[0]?.message ?? "Invalid input.";
    redirectWithError("/settings", firstError);
  }

  const input = validated.data;

  // Handle logo upload
  const logo = formData.get("logo");
  let logoUrl: string | null = null;

  if (logo instanceof File && logo.size > 0) {
    const extension = logo.name.split(".").pop() || "png";
    const path = `${user.id}/logo-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from("logos").upload(path, logo, {
      contentType: logo.type,
      upsert: true,
    });

    if (upload.error) {
      redirectWithError("/settings", "Logo upload failed. Please try a smaller image.");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(path);
    logoUrl = publicUrl;
  }

  const payload: Record<string, unknown> = {
    business_name: input.businessName,
    phone: input.phone,
    business_email: input.businessEmail,
    license_number: input.licenseNumber ?? null,
    website: String(formData.get("website") ?? "").trim() || null,
    custom_fields: customFields,
    hourly_labor_rate: input.hourlyLaborRate,
    paint_cost_per_gallon: input.paintCostPerGallon,
    wall_coverage_sq_ft_per_gallon: input.wallCoverageSqFtPerGallon,
    trim_coverage_sq_ft_per_gallon: input.trimCoverageSqFtPerGallon,
    default_coats: input.defaultCoats,
    material_markup_percent: input.materialMarkupPercent,
    tax_percent: input.taxPercent,
    minimum_job_charge: input.minimumJobCharge,
  };

  if (logoUrl) {
    payload.logo_url = logoUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    redirectWithError("/settings", error.message);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  redirect("/settings?success=true");
}

export async function unlockQuoteAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer.user || !viewer.profile) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirect("/dashboard");
  }

  const quoteId = String(formData.get("quoteId") ?? "").trim();
  if (!quoteId) {
    redirect("/dashboard");
  }

  // Check if already unlocked
  const { data: quote } = await supabase
    .from("quotes")
    .select("id, is_unlocked")
    .eq("id", quoteId)
    .eq("user_id", viewer.user.id)
    .single();

  if (!quote) {
    redirect("/dashboard");
  }

  if (!quote.is_unlocked) {
    // Paid users auto-unlock without credits
    if (viewer.profile.billingStatus === "active") {
      await supabase
        .from("quotes")
        .update({ is_unlocked: true })
        .eq("id", quoteId)
        .eq("user_id", viewer.user.id);
    } else if (viewer.profile.freeQuotesUsed >= viewer.profile.freeQuotesLimit) {
      // No credits left
      redirect("/billing");
    } else {
      // Consume 1 credit and unlock
      await supabase.rpc("increment_free_quotes_used", {
        user_id: viewer.user.id,
      });

      await supabase
        .from("quotes")
        .update({ is_unlocked: true })
        .eq("id", quoteId)
        .eq("user_id", viewer.user.id);
    }
  }

  revalidatePath(`/quotes/${quoteId}`);
  redirect(`/quotes/${quoteId}`);
}


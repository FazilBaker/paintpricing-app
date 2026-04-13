"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { DEFAULT_SETTINGS, FREE_QUOTES_LIMIT, LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { canCreateQuote, getViewer } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { QuoteDraftPayload } from "@/lib/types";
import { safeRedirect, toNullableNumber } from "@/lib/utils";

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
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      redirectWithError(
        "/signup",
        "Account created, but automatic login failed. Please log in.",
      );
    }
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

    if (!upload.error) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("logos").getPublicUrl(path);
      logoUrl = publicUrl;
    }
  }

  const payload = {
    id: user.id,
    business_name: String(formData.get("businessName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    business_email: String(formData.get("businessEmail") ?? "").trim(),
    license_number: String(formData.get("licenseNumber") ?? "").trim() || null,
    hourly_labor_rate:
      toNullableNumber(formData.get("hourlyLaborRate")) ??
      DEFAULT_SETTINGS.hourlyLaborRate,
    paint_cost_per_gallon:
      toNullableNumber(formData.get("paintCostPerGallon")) ??
      DEFAULT_SETTINGS.paintCostPerGallon,
    wall_coverage_sq_ft_per_gallon:
      toNullableNumber(formData.get("wallCoverageSqFtPerGallon")) ??
      DEFAULT_SETTINGS.wallCoverageSqFtPerGallon,
    trim_coverage_sq_ft_per_gallon:
      toNullableNumber(formData.get("trimCoverageSqFtPerGallon")) ??
      DEFAULT_SETTINGS.trimCoverageSqFtPerGallon,
    default_coats:
      toNullableNumber(formData.get("defaultCoats")) ?? DEFAULT_SETTINGS.defaultCoats,
    material_markup_percent:
      toNullableNumber(formData.get("materialMarkupPercent")) ??
      DEFAULT_SETTINGS.materialMarkupPercent,
    tax_percent:
      toNullableNumber(formData.get("taxPercent")) ?? DEFAULT_SETTINGS.taxPercent,
    minimum_job_charge:
      toNullableNumber(formData.get("minimumJobCharge")) ??
      DEFAULT_SETTINGS.minimumJobCharge,
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

  if (!canCreateQuote(viewer.profile)) {
    redirect("/billing");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/quotes/new", "Supabase is not configured.");
  }

  const rawPayload = String(formData.get("payload") ?? "");
  if (!rawPayload) {
    redirectWithError("/quotes/new", "Quote payload is missing.");
  }

  const payload = JSON.parse(rawPayload) as QuoteDraftPayload;

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      user_id: viewer.user.id,
      client_name: payload.client.customerName,
      project_address: payload.client.projectAddress,
      total: payload.summary.grandTotal,
      tax_total: payload.summary.taxTotal,
      labor_total: payload.summary.laborTotal,
      materials_total: payload.summary.materialsTotal,
      quote_data: payload,
    })
    .select("id")
    .single();

  const quoteId = data?.id;

  if (error || !quoteId) {
    redirectWithError("/quotes/new", error?.message ?? "Unable to save quote.");
  }

  await supabase
    .from("quotes")
    .update({
      pdf_url: `/api/quotes/${quoteId}/pdf`,
    })
    .eq("id", quoteId);

  if (viewer.profile.billingStatus !== "active") {
    await supabase
      .from("profiles")
      .update({
        free_quotes_used: viewer.profile.freeQuotesUsed + 1,
      })
      .eq("id", viewer.user.id);
  }

  revalidatePath("/dashboard");
  redirect(`/quotes/${quoteId}`);
}

export async function activateLifetimeDealAction() {
  const viewer = await getViewer();
  if (!viewer.user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    redirectWithError("/billing", "Supabase is not configured.");
  }

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("billing_cycle", "lifetime")
    .eq("billing_status", "active");

  if ((count ?? 0) >= LIFETIME_DEAL_LIMIT) {
    redirectWithError("/billing", "The lifetime launch deal is sold out.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      billing_status: "active",
      billing_cycle: "lifetime",
      lifetime_deal_claimed_at: new Date().toISOString(),
    })
    .eq("id", viewer.user.id);

  if (error) {
    redirectWithError("/billing", error.message);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

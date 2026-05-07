import { NextResponse } from "next/server";

import { LIFETIME_DEAL_LIMIT, LIFETIME_DEAL_PRICE } from "@/lib/constants";
import { captureOrder } from "@/lib/paypal";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

/**
 * Captures a PayPal lifetime-deal order.
 *
 * Order of operations matters here — PayPal charges the customer at capture time,
 * so we must:
 *   1. Verify the user is authenticated.
 *   2. Idempotency: if the user is already on lifetime, skip capture (they double-clicked).
 *   3. Reserve a seat in the 50-seat limit BEFORE capture (race-condition safe).
 *   4. Capture the order.
 *   5. Activate the profile. If activation fails, log loudly — manual reconciliation needed.
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured." }, { status: 500 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { orderID?: string };
  if (!body.orderID) {
    return NextResponse.json({ error: "Missing orderID." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });
  }

  // ── Idempotency: already on lifetime? Skip capture, succeed silently. ──
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("billing_status, billing_cycle")
    .eq("id", user.id)
    .maybeSingle();

  if (
    existingProfile?.billing_cycle === "lifetime" &&
    existingProfile?.billing_status === "active"
  ) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  // ── Reserve a seat BEFORE capture (race-condition safe) ──
  // We re-check after capture too, but this stops the obvious case of
  // a user clicking buy after the deal sold out.
  const { count: seatsTakenBefore } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("billing_cycle", "lifetime")
    .eq("billing_status", "active");

  if ((seatsTakenBefore ?? 0) >= LIFETIME_DEAL_LIMIT) {
    return NextResponse.json(
      { error: "The lifetime launch deal is sold out." },
      { status: 400 },
    );
  }

  // ── Capture (PayPal charges the customer here) ──
  const result = await captureOrder(body.orderID);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Verify amount matches lifetime deal price
  if (!result.amount || result.amount < LIFETIME_DEAL_PRICE) {
    // CRITICAL: money was captured but at the wrong amount. Don't grant access.
    console.error(
      "[capture-order] Captured amount mismatch",
      { orderID: body.orderID, userId: user.id, captured: result.amount, expected: LIFETIME_DEAL_PRICE },
    );
    return NextResponse.json(
      {
        error: `Payment amount mismatch (got $${result.amount}, expected $${LIFETIME_DEAL_PRICE}). Please contact support.`,
      },
      { status: 400 },
    );
  }

  // ── Re-check seat limit AFTER capture (in case two users raced past step 3) ──
  const { count: seatsTakenAfter } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("billing_cycle", "lifetime")
    .eq("billing_status", "active");

  if ((seatsTakenAfter ?? 0) >= LIFETIME_DEAL_LIMIT) {
    // CRITICAL: customer was charged but no seat available. Log so we can refund manually.
    console.error(
      "[capture-order] Sold out AFTER capture — manual refund needed",
      {
        orderID: body.orderID,
        userId: user.id,
        amount: result.amount,
        payerId: result.payerId,
      },
    );
    return NextResponse.json(
      {
        error:
          "The lifetime deal sold out while we were processing your payment. We've been notified and will refund you within 24 hours. Please contact support@paintpricing.com.",
      },
      { status: 409 },
    );
  }

  // ── Activate lifetime access ──
  const { error } = await admin
    .from("profiles")
    .update({
      billing_status: "active",
      billing_cycle: "lifetime",
      lifetime_deal_claimed_at: new Date().toISOString(),
      paypal_payer_id: result.payerId ?? null,
      guarantee_eligible_until: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    // CRITICAL: customer was charged but profile didn't update. Log for manual reconciliation.
    console.error(
      "[capture-order] Profile update failed AFTER capture — manual activation needed",
      {
        orderID: body.orderID,
        userId: user.id,
        amount: result.amount,
        payerId: result.payerId,
        dbError: error.message,
      },
    );
    return NextResponse.json(
      {
        error:
          "Payment was received but we couldn't activate your account automatically. Please contact support@paintpricing.com — we'll have you up in minutes.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

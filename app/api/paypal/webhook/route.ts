import { NextResponse } from "next/server";

import { isPaypalServerConfigured } from "@/lib/env";
import { parseCustomId, verifyWebhookSignature } from "@/lib/paypal";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

const ACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "PAYMENT.SALE.COMPLETED",
]);

const PAST_DUE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
]);

const INACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "CUSTOMER.DISPUTE.CREATED",
]);

export async function POST(request: Request) {
  if (!isPaypalServerConfigured()) {
    return NextResponse.json(
      { error: "PayPal server config missing." },
      { status: 500 },
    );
  }

  const supabase = createSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase admin not configured." },
      { status: 500 },
    );
  }

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify PayPal webhook signature
  const isValid = await verifyWebhookSignature(request.headers, rawBody);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature." },
      { status: 401 },
    );
  }

  const payload = JSON.parse(rawBody) as {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      subscriber?: {
        payer_id?: string;
      };
    };
  };

  const eventType = payload.event_type ?? "";
  const subscriptionId = payload.resource?.id;
  const customId = payload.resource?.custom_id ?? "";

  if (!subscriptionId) {
    return NextResponse.json(
      { error: "Missing resource id." },
      { status: 400 },
    );
  }

  // Determine new billing status
  let billingStatus: string;
  if (ACTIVE_EVENTS.has(eventType)) {
    billingStatus = "active";
  } else if (PAST_DUE_EVENTS.has(eventType)) {
    billingStatus = "past_due";
  } else if (INACTIVE_EVENTS.has(eventType)) {
    billingStatus = "canceled";
  } else {
    // Unhandled event type — acknowledge without action
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Parse userId and cycle from custom_id (format: "userId:cycle")
  const parsed = parseCustomId(customId);

  const updatePayload: Record<string, unknown> = {
    billing_status: billingStatus,
    paypal_subscription_id: subscriptionId,
    paypal_payer_id: payload.resource?.subscriber?.payer_id ?? null,
  };

  if (billingStatus === "active") {
    updatePayload.guarantee_eligible_until = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  if (parsed) {
    updatePayload.billing_cycle = parsed.cycle;
  }

  // Try to update by user ID from custom_id first, fall back to subscription ID
  let updated = false;

  if (parsed?.userId) {
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", parsed.userId);

    if (!error) {
      updated = true;
    }
  }

  if (!updated) {
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("paypal_subscription_id", subscriptionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ ok: true });
}

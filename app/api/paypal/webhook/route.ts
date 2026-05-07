import { NextResponse } from "next/server";

import { isPaypalServerConfigured } from "@/lib/env";
import { parseCustomId, verifyWebhookSignature } from "@/lib/paypal";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

// Subscription lifecycle events — these are tied to a PayPal subscription_id
const SUBSCRIPTION_ACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "BILLING.SUBSCRIPTION.RE-ACTIVATED",
]);

const SUBSCRIPTION_PAST_DUE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
]);

const SUBSCRIPTION_INACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
]);

const DISPUTE_EVENTS = new Set([
  "CUSTOMER.DISPUTE.CREATED",
]);

/**
 * Handles PayPal billing webhooks.
 *
 * Subscription events update by subscription_id (or custom_id userId).
 * One-time payment events (PAYMENT.SALE.COMPLETED) are intentionally NOT handled here
 * because lifetime captures are activated synchronously in /api/paypal/capture-order.
 * Handling them here would risk double-activation or false-positive on unrelated payments.
 */
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
    resource_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      billing_agreement_id?: string;
      subscriber?: {
        payer_id?: string;
      };
    };
  };

  const eventType = payload.event_type ?? "";
  const resourceId = payload.resource?.id;
  const customId = payload.resource?.custom_id ?? "";

  if (!resourceId) {
    return NextResponse.json(
      { error: "Missing resource id." },
      { status: 400 },
    );
  }

  // Determine new billing status from the event type
  let billingStatus: string | null = null;
  if (SUBSCRIPTION_ACTIVE_EVENTS.has(eventType)) {
    billingStatus = "active";
  } else if (SUBSCRIPTION_PAST_DUE_EVENTS.has(eventType)) {
    billingStatus = "past_due";
  } else if (SUBSCRIPTION_INACTIVE_EVENTS.has(eventType)) {
    billingStatus = "canceled";
  } else if (DISPUTE_EVENTS.has(eventType)) {
    billingStatus = "canceled";
  } else {
    // Unhandled event type (e.g. PAYMENT.SALE.COMPLETED on a subscription
    // already activated synchronously). Acknowledge without action.
    return NextResponse.json({ ok: true, ignored: true, eventType });
  }

  const parsed = parseCustomId(customId);

  const updatePayload: Record<string, unknown> = {
    billing_status: billingStatus,
  };

  if (billingStatus === "active") {
    updatePayload.guarantee_eligible_until = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }

  if (parsed) {
    updatePayload.billing_cycle = parsed.cycle;
  }

  // Capture payer_id when available
  if (payload.resource?.subscriber?.payer_id) {
    updatePayload.paypal_payer_id = payload.resource.subscriber.payer_id;
  }

  // For subscription events, store the subscription id so we can match it on later events
  // (e.g. SUSPENDED comes through with the same resource.id)
  updatePayload.paypal_subscription_id = resourceId;

  // Try to update by user ID from custom_id first, fall back to subscription ID
  if (parsed?.userId) {
    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", parsed.userId);

    if (!error) {
      return NextResponse.json({ ok: true, matchedBy: "userId" });
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("paypal_subscription_id", resourceId);

  if (error) {
    console.error("[paypal webhook] update failed", { eventType, resourceId, error: error.message });
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, matchedBy: "subscriptionId" });
}

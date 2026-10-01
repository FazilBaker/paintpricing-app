import { NextResponse } from "next/server";

import { adminEmails } from "@/lib/admin";
import { sendDisputeAlertEmail } from "@/lib/email";
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

const SUBSCRIPTION_CYCLES = new Set(["monthly", "yearly"]);

/**
 * Handles PayPal billing webhooks.
 *
 * WHO A SIGNED EVENT IS ABOUT. The signature proves PayPal sent the event. It does NOT make the
 * event's custom_id trustworthy: custom_id was written by the buyer's browser when the
 * subscription was created, so it says whatever the buyer wanted it to say.
 *
 * The previous version picked the profile by custom_id first, for every event. That allowed:
 *   - Create a subscription tagged with a victim's user id, then cancel it: the CANCELLED event
 *     downgraded the victim.
 *   - Or, more quietly: let ACTIVATED overwrite the victim's paypal_subscription_id with the
 *     attacker's, then cancel later. Every future event about the attacker's subscription would
 *     then land on the victim.
 *
 * So:
 *   - Events that REMOVE access (failed payment, cancel, suspend, expire) match ONLY by
 *     paypal_subscription_id, the id we stored when the subscription was activated server side.
 *   - Events that GRANT access may fall back to custom_id, but only onto a profile that has never
 *     had a subscription and is not a lifetime customer, and only with a real subscription cycle.
 *     Granting to the wrong account costs nothing; overwriting someone's subscription id is what
 *     made the attack work, and this never does that.
 *   - Disputes alert the owner and change nothing; see sendDisputeAlertEmail for why.
 *
 * One-time payment events (PAYMENT.SALE.COMPLETED) are intentionally NOT handled here because
 * lifetime captures are activated synchronously in /api/paypal/capture-order.
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
    id?: string;
    event_type?: string;
    resource_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      reason?: string;
      status?: string;
      dispute_amount?: { value?: string; currency_code?: string };
      disputed_transactions?: Array<{ seller_transaction_id?: string; custom?: string }>;
      subscriber?: {
        payer_id?: string;
      };
    };
  };

  const eventType = payload.event_type ?? "";
  const resourceId = payload.resource?.id;

  if (!resourceId) {
    return NextResponse.json(
      { error: "Missing resource id." },
      { status: 400 },
    );
  }

  // ── Disputes: alert, do not act ──
  if (DISPUTE_EVENTS.has(eventType)) {
    const tx = payload.resource?.disputed_transactions?.[0];
    const details = {
      event: eventType,
      webhookEventId: payload.id,
      disputeId: resourceId,
      reason: payload.resource?.reason,
      status: payload.resource?.status,
      amount: `${payload.resource?.dispute_amount?.value ?? "?"} ${payload.resource?.dispute_amount?.currency_code ?? ""}`,
      sellerTransactionId: tx?.seller_transaction_id,
      buyerSuppliedReference: tx?.custom,
    };
    console.error("[paypal webhook] Dispute opened, owner alerted, no access changed", details);
    try {
      await sendDisputeAlertEmail(adminEmails(), details);
    } catch (e) {
      console.error("[paypal webhook] Dispute alert email failed", { error: String(e) });
    }
    return NextResponse.json({ ok: true, alerted: true });
  }

  // Determine new billing status from the event type
  let billingStatus: "active" | "past_due" | "canceled";
  if (SUBSCRIPTION_ACTIVE_EVENTS.has(eventType)) {
    billingStatus = "active";
  } else if (SUBSCRIPTION_PAST_DUE_EVENTS.has(eventType)) {
    billingStatus = "past_due";
  } else if (SUBSCRIPTION_INACTIVE_EVENTS.has(eventType)) {
    billingStatus = "canceled";
  } else {
    // Unhandled event type (e.g. PAYMENT.SALE.COMPLETED on a subscription
    // already activated synchronously). Acknowledge without action.
    return NextResponse.json({ ok: true, ignored: true, eventType });
  }

  const updatePayload: Record<string, unknown> = {
    billing_status: billingStatus,
  };
  if (billingStatus === "active") {
    updatePayload.guarantee_eligible_until = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();
  }
  if (payload.resource?.subscriber?.payer_id) {
    updatePayload.paypal_payer_id = payload.resource.subscriber.payer_id;
  }

  // ── 1. The trustworthy match: the subscription id we stored server side ──
  const { data: bySub, error: bySubError } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("paypal_subscription_id", resourceId)
    .select("id");

  if (bySubError) {
    console.error("[paypal webhook] update failed", { eventType, resourceId, error: bySubError.message });
    return NextResponse.json({ error: bySubError.message }, { status: 500 });
  }
  if (bySub && bySub.length > 0) {
    return NextResponse.json({ ok: true, matchedBy: "subscriptionId", rows: bySub.length });
  }

  // ── 2. Nobody holds this subscription. Only an access-GRANTING event may go further. ──
  if (billingStatus !== "active") {
    // A cancel or failure for a subscription no account holds. Never guess who it is for.
    return NextResponse.json({ ok: true, ignored: true, reason: "no profile holds this subscription" });
  }

  const parsed = parseCustomId(payload.resource?.custom_id ?? "");
  if (!parsed || !SUBSCRIPTION_CYCLES.has(parsed.cycle)) {
    return NextResponse.json({ ok: true, ignored: true, reason: "no usable custom_id" });
  }

  // Only onto a profile that has never had a subscription and is not a lifetime customer, so this
  // can never displace someone's existing subscription id.
  const { data: byUser, error: byUserError } = await supabase
    .from("profiles")
    .update({
      ...updatePayload,
      billing_cycle: parsed.cycle,
      paypal_subscription_id: resourceId,
    })
    .eq("id", parsed.userId)
    .is("paypal_subscription_id", null)
    // NULL billing_cycle must be allowed explicitly: `neq` alone excludes NULLs in SQL.
    .or("billing_cycle.is.null,billing_cycle.neq.lifetime")
    .select("id");
  const rows = byUser?.length ?? 0;

  if (byUserError) {
    console.error("[paypal webhook] update failed", { eventType, resourceId, error: byUserError.message });
    return NextResponse.json({ error: byUserError.message }, { status: 500 });
  }

  return NextResponse.json(
    rows > 0
      ? { ok: true, matchedBy: "customIdFirstSubscription" }
      : { ok: true, ignored: true, reason: "profile already has a subscription or is lifetime" },
  );
}

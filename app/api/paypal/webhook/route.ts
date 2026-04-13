import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACTIVE_EVENTS = new Set([
  "CLIENT.APPROVED",
  "CLIENT.LIFETIME.APPROVED",
  "BILLING.SUBSCRIPTION.ACTIVATED",
  "PAYMENT.SALE.COMPLETED",
]);

const INACTIVE_EVENTS = new Set([
  "BILLING.SUBSCRIPTION.CANCELLED",
  "BILLING.SUBSCRIPTION.SUSPENDED",
  "BILLING.SUBSCRIPTION.EXPIRED",
  "CUSTOMER.DISPUTE.CREATED",
]);

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
  }

  const payload = (await request.json()) as {
    event_type?: string;
    resource?: {
      id?: string;
      custom_id?: string;
      subscriber?: {
        payer_id?: string;
      };
    };
  };

  const subscriptionId = payload.resource?.id;
  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing subscription id." }, { status: 400 });
  }

  const status = ACTIVE_EVENTS.has(payload.event_type ?? "")
    ? "active"
    : INACTIVE_EVENTS.has(payload.event_type ?? "")
      ? "canceled"
      : "approval_pending";

  const billingCycle =
    payload.resource?.custom_id === "lifetime"
      ? "lifetime"
      : payload.resource?.custom_id ?? null;

  const guaranteeEligibleUntil =
    status === "active"
      ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { error } = await supabase
    .from("profiles")
    .update({
      billing_status: status,
      billing_cycle: billingCycle,
      paypal_subscription_id: subscriptionId,
      paypal_payer_id: payload.resource?.subscriber?.payer_id ?? null,
      guarantee_eligible_until: guaranteeEligibleUntil,
      lifetime_deal_claimed_at:
        billingCycle === "lifetime" && status === "active"
          ? new Date().toISOString()
          : null,
    })
    .eq("paypal_subscription_id", subscriptionId);

  if (error) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const fallbackUpdate = await supabase
      .from("profiles")
      .update({
        billing_status: status,
        billing_cycle: billingCycle,
        paypal_subscription_id: subscriptionId,
        paypal_payer_id: payload.resource?.subscriber?.payer_id ?? null,
        guarantee_eligible_until: guaranteeEligibleUntil,
        lifetime_deal_claimed_at:
          billingCycle === "lifetime" && status === "active"
            ? new Date().toISOString()
            : null,
      })
      .eq("id", user.id);

    if (fallbackUpdate.error) {
      return NextResponse.json(
        { error: fallbackUpdate.error.message },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { verifySubscription } from "@/lib/paypal";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

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

  const body = (await request.json()) as {
    subscriptionID?: string;
    cycle?: string;
  };

  if (!body.subscriptionID || !body.cycle) {
    return NextResponse.json(
      { error: "Missing subscriptionID or cycle." },
      { status: 400 },
    );
  }

  if (body.cycle !== "monthly" && body.cycle !== "yearly") {
    return NextResponse.json({ error: "Invalid cycle." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });
  }

  // ── Idempotency: already on this subscription? Skip work. ──
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("billing_status, paypal_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    existingProfile?.paypal_subscription_id === body.subscriptionID &&
    existingProfile?.billing_status === "active"
  ) {
    return NextResponse.json({ ok: true, alreadyActive: true });
  }

  // ── Verify subscription is actually active with PayPal ──
  const result = await verifySubscription(body.subscriptionID);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { error } = await admin
    .from("profiles")
    .update({
      billing_status: "active",
      billing_cycle: body.cycle,
      paypal_subscription_id: body.subscriptionID,
      paypal_payer_id: result.payerId ?? null,
      guarantee_eligible_until: new Date(
        Date.now() + 14 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    console.error(
      "[activate-subscription] Profile update failed",
      {
        subscriptionID: body.subscriptionID,
        userId: user.id,
        cycle: body.cycle,
        dbError: error.message,
      },
    );
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

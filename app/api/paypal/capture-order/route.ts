import { NextResponse } from "next/server";

import { LIFETIME_DEAL_LIMIT, LIFETIME_DEAL_PRICE } from "@/lib/constants";
import { captureOrder } from "@/lib/paypal";
import { createSupabaseAdminClient, createSupabaseServerClient } from "@/lib/supabase/server";

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

  // Capture the order server-side
  const result = await captureOrder(body.orderID);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Verify amount matches lifetime deal price
  if (!result.amount || result.amount < LIFETIME_DEAL_PRICE) {
    return NextResponse.json(
      { error: `Amount ${result.amount} does not match lifetime price ${LIFETIME_DEAL_PRICE}.` },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Admin client not configured." }, { status: 500 });
  }

  // Check 50-seat limit
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("billing_cycle", "lifetime")
    .eq("billing_status", "active");

  if ((count ?? 0) >= LIFETIME_DEAL_LIMIT) {
    return NextResponse.json(
      { error: "The lifetime launch deal is sold out." },
      { status: 400 },
    );
  }

  // Activate lifetime access
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
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

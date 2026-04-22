import { NextResponse } from "next/server";

import { LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ remaining: LIFETIME_DEAL_LIMIT, total: LIFETIME_DEAL_LIMIT });
  }

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("billing_cycle", "lifetime")
    .eq("billing_status", "active");

  const sold = count ?? 0;
  const remaining = Math.max(LIFETIME_DEAL_LIMIT - sold, 0);

  return NextResponse.json(
    { remaining, total: LIFETIME_DEAL_LIMIT },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}

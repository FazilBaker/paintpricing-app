import { NextResponse } from "next/server";

import { LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ALLOWED_ORIGINS = new Set([
  "https://paintpricing.com",
  "https://www.paintpricing.com",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  // Echo back allowed origins; any other origin gets no CORS access
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }
  return {};
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: {
      ...corsHeaders(origin),
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  // Use admin client to bypass RLS — the regular client would only see
  // the requesting user's own profile (or none if unauthenticated), making
  // the count meaningless. This endpoint only returns aggregated counts,
  // never individual rows, so admin access is safe.
  const supabase = createSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { remaining: LIFETIME_DEAL_LIMIT, sold: 0, total: LIFETIME_DEAL_LIMIT },
      { headers: cors },
    );
  }

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("billing_cycle", "lifetime")
    .eq("billing_status", "active");

  const sold = count ?? 0;
  const remaining = Math.max(LIFETIME_DEAL_LIMIT - sold, 0);

  return NextResponse.json(
    { remaining, sold, total: LIFETIME_DEAL_LIMIT },
    {
      headers: {
        ...cors,
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    },
  );
}

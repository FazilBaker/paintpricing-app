import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { safeRedirect } from "@/lib/utils";

/**
 * Handles Supabase auth callbacks for two flows:
 *
 * 1. PKCE flow (?code=XXX) — used by OAuth providers and password-flow signups
 *    initiated on the SAME device that opens the email. Requires a code verifier
 *    cookie set during the original session.
 *
 * 2. OTP token_hash flow (?token_hash=XXX&type=signup|recovery|...) — used by
 *    email-confirmation links that may be opened on a DIFFERENT device than
 *    where signup originated (very common: signs up on desktop, opens email on
 *    phone). The token_hash itself is the proof — no cookie needed — so this
 *    works cross-device. Recommended for confirmation emails by Supabase docs.
 *
 * The handler tries PKCE first if `code` is present, then falls through to OTP
 * verification if `token_hash` is present. Either success path redirects to
 * `next` (default /dashboard). Failure redirects to /login with an error.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  // Reject absolute URLs and protocol-relative URLs to prevent open redirects.
  const next = safeRedirect(searchParams.get("next"), "/dashboard");

  const cookieStore = await cookies();
  const redirectTo = new URL(next, origin);
  const successResponse = NextResponse.redirect(redirectTo);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Set cookies on the redirect response so they reach the browser
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Flow 1: PKCE — exchangeCodeForSession (requires code verifier cookie)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return successResponse;
    }
    console.error("[auth/callback] PKCE exchange failed:", error.message);
  }

  // Flow 2: OTP token_hash — cross-device-friendly, no cookie required
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return successResponse;
    }
    console.error("[auth/callback] OTP verifyOtp failed:", error.message);
  }

  // Both flows failed (or neither set of params provided). Redirect to login
  // with a friendly error. Include the original link param so support can
  // diagnose (without exposing the token to logs publicly).
  return NextResponse.redirect(
    new URL(
      `/login?error=${encodeURIComponent("Your confirmation link is invalid or has expired. Please request a new one or sign up again.")}`,
      origin,
    ),
  );
}

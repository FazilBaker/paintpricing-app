"use client";

import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type GoogleSignInButtonProps = {
  /**
   * Label shown on the button. Defaults differ between signup and login to match
   * the rest of the form's mode-aware copy.
   */
  label?: string;
  /**
   * Where to land the user after a successful OAuth round-trip. Passed through to
   * the existing /auth/callback handler via its ?next= param. Default: /dashboard.
   */
  next?: string;
};

/**
 * Single-click Google sign-in for painters. Initiates Supabase's OAuth PKCE flow,
 * which redirects to Google, then back to /auth/callback?code=... where the
 * existing route handler exchanges the code for a session.
 *
 * Setup requirements (one-time, both done outside this codebase):
 *   1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0
 *      Client ID (Web application). Authorized JavaScript origins:
 *        https://app.paintpricing.com, http://localhost:3000
 *      Authorized redirect URIs (Supabase project callback only — NOT our app):
 *        https://<project-ref>.supabase.co/auth/v1/callback
 *   2. Supabase Dashboard → Authentication → Providers → Google → Enable,
 *      paste Client ID + Client Secret. Add our app paths under
 *      Authentication → URL Configuration → Redirect URLs:
 *        https://app.paintpricing.com/auth/callback
 *        http://localhost:3000/auth/callback
 *
 * No app secrets are stored client-side; the OAuth client secret stays in
 * Supabase's dashboard and is never shipped to the browser.
 */
export function GoogleSignInButton({ label, next = "/dashboard" }: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setPending(true);
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Authentication is temporarily unavailable. Please try again in a moment.");
      setPending(false);
      return;
    }

    // Compose the post-OAuth redirect using window.location.origin so the same
    // build works for app.paintpricing.com, preview deploys, and localhost.
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        // Request the standard identity scopes only. No Drive/Calendar/etc.
        scopes: "email profile",
        queryParams: {
          // Force account chooser so painters with multiple Google accounts can
          // pick the right business one rather than being silently logged in.
          prompt: "select_account",
        },
      },
    });

    if (oauthError) {
      setError(oauthError.message ?? "Could not start Google sign-in. Please try again.");
      setPending(false);
    }
    // On success Supabase redirects the browser; nothing more to do here.
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        size="lg"
        className="w-full"
        onClick={handleClick}
        disabled={pending}
        aria-label={label ?? "Continue with Google"}
      >
        <GoogleGlyph />
        <span className="ml-2.5">{pending ? "Opening Google…" : (label ?? "Continue with Google")}</span>
      </Button>
      {error && (
        <p
          className="text-xs text-[var(--danger)]"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Inline Google "G" mark, sized to match a 20px button glyph. Plain SVG so we
 * do not pull in an icon dependency.
 */
function GoogleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"/>
      <path fill="#FBBC05" d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58Z"/>
    </svg>
  );
}

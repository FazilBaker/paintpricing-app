"use client";

import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

/**
 * Attaches the signed-in user to their PostHog session.
 *
 * posthog.init runs with person_profiles: "identified_only", and until this
 * component existed nothing in the app ever called identify(). The result was
 * that PostHog held zero person profiles: sessions were recorded, but there
 * was no way to look up a specific painter, or to answer "what did the user
 * who signed up on 24 July actually do".
 *
 * Rendered from the authenticated layout, so it runs on every signed-in page.
 * identify() is idempotent for a given distinct_id, so re-running it on
 * navigation is harmless.
 */
export function PostHogIdentify({
  userId,
  email,
  businessName,
  billingStatus,
}: {
  userId: string;
  email?: string | null;
  businessName?: string | null;
  billingStatus?: string | null;
}) {
  const ph = usePostHog();

  useEffect(() => {
    if (!ph || !userId) return;

    // Only re-identify when the distinct_id actually changes. Calling identify
    // with a different id than the current one is what links an anonymous
    // pre-login session to the person.
    if (ph.get_distinct_id() !== userId) {
      ph.identify(userId, {
        email: email ?? undefined,
        business_name: businessName || undefined,
        billing_status: billingStatus ?? undefined,
      });
      return;
    }

    // Same person, but these properties can change during a session (they
    // finish onboarding, they upgrade). Keep them current without re-linking.
    ph.setPersonProperties({
      email: email ?? undefined,
      business_name: businessName || undefined,
      billing_status: billingStatus ?? undefined,
    });
  }, [ph, userId, email, businessName, billingStatus]);

  return null;
}

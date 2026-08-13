import posthog from "posthog-js";

/**
 * The activation funnel, as a closed set of event names.
 *
 * Before this existed the only event the app ever sent was $pageview, so the
 * questions that actually matter (did they open the builder, did they add a
 * room, did they save anything, did they ever see a PDF) had no answer in the
 * data. Keep this list short: an event nobody looks at is noise.
 */
export type AnalyticsEvent =
  | "onboarding_completed"
  | "onboarding_skipped"
  | "builder_opened"
  | "quote_item_added"
  | "quote_saved"
  | "pdf_exported"
  | "upgrade_clicked";

/**
 * Fire-and-forget event capture. Safe to call from anywhere in client code:
 * no-ops when PostHog is not configured (local dev without keys) rather than
 * throwing into a click handler.
 */
export function track(
  event: AnalyticsEvent,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  if (typeof window === "undefined") return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, properties);
  } catch (err) {
    // Analytics must never break a user action.
    console.error("[analytics] capture failed:", err);
  }
}

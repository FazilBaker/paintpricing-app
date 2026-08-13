"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    capture_pageview: false, // handled manually via PostHogPageView
    capture_pageleave: true,
    // Person profiles are only created for users we explicitly identify.
    // See components/posthog-identify.tsx, which does that on every
    // authenticated page. Without that call this setting means NO person
    // profiles exist at all and every session is anonymous.
    person_profiles: "identified_only",
  });
}

/**
 * Fires $pageview on every route change, not only the first paint.
 *
 * The previous version depended on [ph], which never changes: this component
 * lives in the root layout, the root layout does not remount on App Router
 * client-side navigation, and the PostHog client reference is stable. So the
 * effect ran exactly once per full page load and every in-app navigation went
 * unrecorded. That is why we could not tell whether a signed-up painter ever
 * reached /quotes/new after landing on /dashboard.
 *
 * pathname and searchParams are the values that actually change on a soft
 * navigation. useSearchParams requires a Suspense boundary in the App Router,
 * hence the wrapper in PostHogProvider below.
 */
function PostHogPageView() {
  const ph = usePostHog();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!ph || !pathname) return;
    const qs = searchParams?.toString();
    ph.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}${qs ? `?${qs}` : ""}`,
    });
  }, [ph, pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}

"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { track, type AnalyticsEvent } from "@/lib/analytics";

/**
 * A next/link that fires an analytics event on click.
 *
 * Exists because the pages that own the two conversion-critical links (the PDF
 * export on a saved quote, and the upgrade CTAs) are server components, which
 * cannot carry an onClick handler. Wrapping just the link keeps those pages on
 * the server.
 */
export function TrackedLink({
  event,
  eventProps,
  onClick,
  ...props
}: ComponentProps<typeof Link> & {
  event: AnalyticsEvent;
  eventProps?: Record<string, string | number | boolean | null | undefined>;
}) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a Cloudflare Turnstile widget and emits the verification token as a
 * hidden form input named `cf-turnstile-response` so it's included when the
 * parent <form> submits.
 *
 * The Cloudflare script is loaded once per page on first render. The widget
 * is auto-rendered as soon as the script is ready.
 *
 * If `siteKey` is empty/null, this component renders nothing — graceful
 * degradation when Turnstile isn't configured yet.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        selector: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "invisible";
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
    __ppTurnstileLoaders?: Array<() => void>;
  }
}

type Props = {
  siteKey: string | null;
};

export function TurnstileWidget({ siteKey }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");
  const widgetIdRef = useRef<string>("");

  useEffect(() => {
    if (!siteKey) return;
    let mounted = true;

    function renderWidget() {
      if (!mounted || !ref.current || !window.turnstile) return;
      // Avoid double-render in React strict mode
      if (widgetIdRef.current) return;
      try {
        widgetIdRef.current = window.turnstile.render(ref.current, {
          sitekey: siteKey!,
          callback: (t: string) => {
            if (mounted) setToken(t);
          },
          "error-callback": () => {
            if (mounted) setToken("");
          },
          "expired-callback": () => {
            if (mounted) setToken("");
          },
          theme: "light",
          appearance: "always",
        });
      } catch (err) {
        console.error("[turnstile] render error", err);
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      // Queue the render and load the script if not already in flight
      window.__ppTurnstileLoaders ??= [];
      window.__ppTurnstileLoaders.push(renderWidget);

      if (!document.getElementById("cf-turnstile-script")) {
        const script = document.createElement("script");
        script.id = "cf-turnstile-script";
        script.src =
          "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onPPTurnstileLoad";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        // Hook the onload — fan out to all queued loaders
        (window as unknown as { onPPTurnstileLoad: () => void }).onPPTurnstileLoad = () => {
          (window.__ppTurnstileLoaders || []).forEach((fn) => fn());
          window.__ppTurnstileLoaders = [];
        };
      }
    }

    return () => {
      mounted = false;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* ignore */
        }
        widgetIdRef.current = "";
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div className="space-y-1">
      <div ref={ref} className="flex justify-center" />
      <input type="hidden" name="cf-turnstile-response" value={token} />
    </div>
  );
}

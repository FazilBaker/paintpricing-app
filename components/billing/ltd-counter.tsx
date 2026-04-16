"use client";

import { useEffect, useState } from "react";

interface LtdCounterProps {
  initialRemaining: number;
  total: number;
}

export function LtdCounter({ initialRemaining, total }: LtdCounterProps) {
  const [remaining, setRemaining] = useState(initialRemaining);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch("/api/ltd-count");
        if (res.ok && active) {
          const data = await res.json();
          setRemaining(data.remaining);
        }
      } catch {
        // Silently fail — stale count is fine
      }
    }

    // Poll every 30 seconds
    const interval = setInterval(poll, 30_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const percentage = ((total - remaining) / total) * 100;
  const soldOut = remaining <= 0;
  const urgency = remaining <= 10;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-2xl font-bold font-mono tabular-nums">
          {remaining}
        </span>
        <span className="text-sm text-[var(--muted)]">of {total} left</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full rounded-full bg-[var(--line)] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            soldOut
              ? "bg-[var(--danger)]"
              : urgency
                ? "bg-[var(--accent)]"
                : "bg-[var(--success)]"
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>

      {urgency && !soldOut && (
        <p className="text-xs font-medium text-[var(--accent-strong)]">
          Almost gone — only {remaining} spot{remaining === 1 ? "" : "s"} left
        </p>
      )}
    </div>
  );
}

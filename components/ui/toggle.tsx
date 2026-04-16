import * as React from "react";

import { cn } from "@/lib/utils";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  className?: string;
}

export function Toggle({ checked, onChange, label, className }: ToggleProps) {
  return (
    <label
      className={cn(
        "flex min-h-[var(--tap-target)] cursor-pointer items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-medium transition hover:border-[var(--line-strong)]",
        checked && "border-[var(--brand)] bg-[var(--brand-soft)]",
        className,
      )}
    >
      <span>{label}</span>
      <div
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-[var(--brand)]" : "bg-[var(--line-strong)]",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked && "translate-x-5",
          )}
        />
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
    </label>
  );
}

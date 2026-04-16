import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    inputMode={type === "number" ? "decimal" : undefined}
    className={cn(
      "flex h-12 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-4 text-base text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-muted)]",
      type === "number" && "font-mono",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

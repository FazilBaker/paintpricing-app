import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-12 w-full rounded-2xl border border-[var(--line)] bg-white px-4 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(25,101,210,0.12)]",
      className,
    )}
    {...props}
  />
));

Input.displayName = "Input";

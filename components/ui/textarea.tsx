import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[120px] w-full rounded-3xl border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--brand)] focus:ring-4 focus:ring-[rgba(25,101,210,0.12)]",
      className,
    )}
    {...props}
  />
));

Textarea.displayName = "Textarea";

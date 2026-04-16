import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--brand)] text-white shadow-[var(--shadow)] hover:bg-[var(--brand-strong)] active:bg-[var(--brand-strong)]",
        secondary:
          "border-2 border-[var(--line-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--brand-soft)] hover:border-[var(--brand)] active:bg-[var(--brand-soft)]",
        ghost:
          "text-[var(--foreground)] hover:bg-[var(--brand-muted)] active:bg-[var(--brand-muted)]",
        accent:
          "bg-[var(--accent)] text-white shadow-[var(--shadow)] hover:bg-[var(--accent-strong)] active:bg-[var(--accent-strong)]",
        danger:
          "bg-[var(--danger)] text-white hover:bg-red-700 active:bg-red-800",
      },
      size: {
        sm: "h-10 px-4 text-sm",
        md: "h-12 px-5 text-sm",
        lg: "h-14 px-6 text-base",
        icon: "h-12 w-12 p-0",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

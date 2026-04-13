import { cn } from "@/lib/utils";

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[var(--brand-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-strong)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

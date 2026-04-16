import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="container-shell flex min-h-dvh items-center justify-center py-12">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-[var(--brand)]">PaintPricing</h1>
          <p className="text-sm text-[var(--muted)]">
            Professional painting quotes in minutes, not hours.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/signup">Create account</Link>
          </Button>
          <Button asChild variant="secondary" size="lg">
            <Link href="/login">Log in</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}

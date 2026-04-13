import Link from "next/link";

import { signOutAction } from "@/app/actions";
import { requireViewer } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await requireViewer();

  if (!viewer.configured) {
    return (
      <main className="container-shell py-16">
        <div className="panel rounded-[32px] p-8">
          <h1 className="font-display text-3xl font-bold">Configure your environment</h1>
          <p className="mt-4 max-w-2xl text-[var(--muted)]">
            Add your Supabase and PayPal environment variables to test the
            authenticated app experience.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="container-shell py-6">
        <div className="panel flex flex-col gap-4 rounded-[28px] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link className="font-display text-2xl font-bold" href="/dashboard">
              PaintPricing.com
            </Link>
            <p className="text-sm text-[var(--muted)]">
              {viewer.profile?.businessName || viewer.user?.email}
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/quotes/new">New Quote</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/billing">Billing</Link>
            </Button>
            <form action={signOutAction}>
              <Button size="sm" type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

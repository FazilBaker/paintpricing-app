import Link from "next/link";
import { FileText, Home, Plus, Receipt, Settings, Shield } from "lucide-react";

import { signOutAction } from "@/app/actions";
import { isAdmin } from "@/lib/admin";
import { requireViewer } from "@/lib/auth";
import { Button } from "@/components/ui/button";

function NavLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 px-3 py-2 text-[var(--muted)] transition hover:text-[var(--brand)]"
    >
      <Icon className="h-5 w-5" />
      <span className="text-[11px] font-medium">{label}</span>
    </Link>
  );
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const viewer = await requireViewer();

  if (!viewer.configured) {
    return (
      <main className="container-shell flex min-h-dvh items-center justify-center py-16">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[var(--shadow)]">
          <h1 className="text-xl font-bold">Configure your environment</h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Add your Supabase and PayPal environment variables to test the
            authenticated app experience.
          </p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh pb-20 sm:pb-0 overflow-x-hidden">
      {/* Desktop top bar */}
      <header className="hidden sm:block container-shell py-4">
        <div className="flex items-center justify-between rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface)] px-5 py-3 shadow-[var(--shadow-sm)]">
          <div className="flex items-center gap-6">
            <Link className="text-lg font-bold text-[var(--brand)]" href="/dashboard">
              PaintPricing
            </Link>
            <nav className="flex items-center gap-1">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/quotes/new">New Quote</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/billing">Billing</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/settings">Settings</Link>
              </Button>
              {isAdmin(viewer.user?.email) && (
                <Button asChild variant="ghost" size="sm">
                  <Link href="/admin">Admin</Link>
                </Button>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)]">
              {viewer.profile?.businessName || viewer.user?.email}
            </span>
            <form action={signOutAction}>
              <Button size="sm" type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Mobile top bar — minimal */}
      <header className="sm:hidden flex items-center justify-between px-4 py-3">
        <Link className="text-lg font-bold text-[var(--brand)]" href="/dashboard">
          PaintPricing
        </Link>
        <form action={signOutAction}>
          <Button size="sm" type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </header>

      {children}

      {/* Mobile bottom nav — thumb zone */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-[var(--line)] bg-[var(--surface)] safe-bottom">
        <NavLink href="/dashboard" icon={Home} label="Home" />
        <NavLink href="/quotes/new" icon={Plus} label="Quote" />
        <NavLink href="/billing" icon={Receipt} label="Billing" />
        <NavLink href="/settings" icon={Settings} label="Settings" />
        {isAdmin(viewer.user?.email) && (
          <NavLink href="/admin" icon={Shield} label="Admin" />
        )}
      </nav>
    </div>
  );
}

import Link from "next/link";
import { Home, Plus, Receipt, Settings, Shield } from "lucide-react";

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
      {/* Desktop top nav */}
      <header className="hidden sm:flex items-center gap-7 px-7 py-4 bg-[var(--surface)] border-b border-[var(--line)] sticky top-0 z-30">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
          <div className="pp-logo-mark" />
          <div>
            <span className="text-[17px] font-bold text-[var(--navy-700)] tracking-tight leading-none">PaintPricing</span>
            <span className="hidden lg:block text-[11px] text-[var(--muted)] leading-none mt-0.5">Built for painters who work for a living.</span>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center gap-1 flex-1">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/quotes/new", label: "New Quote" },
            { href: "/billing", label: "Billing" },
            { href: "/settings", label: "Settings" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="px-3.5 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--navy-50)] hover:text-[var(--navy-700)]"
            >
              {label}
            </Link>
          ))}
          {isAdmin(viewer.user?.email) && (
            <Link
              href="/admin"
              className="px-3.5 py-2 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-[var(--navy-50)] hover:text-[var(--navy-700)]"
            >
              Admin
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, var(--amber-500), var(--amber-600))" }}
          >
            {(viewer.profile?.businessName || viewer.user?.email || "P").charAt(0).toUpperCase()}
          </div>
          <form action={signOutAction}>
            <Button size="sm" type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      {/* Mobile top bar */}
      <header className="sm:hidden flex items-center justify-between px-4 py-3 bg-[var(--surface)] border-b border-[var(--line)]">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="pp-logo-mark" />
          <span className="text-[15px] font-bold text-[var(--navy-700)] tracking-tight">PaintPricing</span>
        </Link>
        <form action={signOutAction}>
          <Button size="sm" type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </header>

      {children}

      {/* Mobile bottom nav */}
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

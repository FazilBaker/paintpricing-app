import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<void>;
  error?: string;
};

const swatchColors = [
  "var(--amber-500)",
  "var(--amber-400)",
  "#C0D4E6",
  "#8FAAC7",
  "#4B6A8B",
  "#2C4C74",
];

export function AuthForm({ mode, action, error }: AuthFormProps) {
  const isLogin = mode === "login";

  return (
    <main className="min-h-dvh grid sm:grid-cols-2">
      {/* Left: brand panel */}
      <div
        className="hidden sm:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--navy-800), var(--navy-900))", color: "white" }}
      >
        {/* Stripe texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.03) 10px 11px)" }}
        />
        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="pp-logo-mark" />
          <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>PaintPricing</span>
        </div>
        {/* Hero copy */}
        <div className="relative">
          <h2 style={{ fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15, margin: "0 0 16px", maxWidth: 400 }}>
            Professional painting quotes in minutes, not hours.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", lineHeight: 1.55, maxWidth: 360, margin: 0 }}>
            Tap a room, enter a few numbers, hit save. We turn it into a branded PDF you can send straight from the job site.
          </p>
          {/* Paint swatches */}
          <div className="flex gap-2 mt-7">
            {swatchColors.map((c, i) => (
              <div key={i} style={{ width: 44, height: 14, background: c, borderRadius: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }} />
            ))}
          </div>
        </div>
        {/* Tagline */}
        <div className="relative" style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
          Built for painters who work for a living.
        </div>
      </div>

      {/* Right: form panel */}
      <div className="flex items-center justify-center p-8 sm:p-12 bg-[var(--background)]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="sm:hidden flex items-center gap-2 mb-8">
            <div className="pp-logo-mark" />
            <span className="font-bold text-[var(--navy-700)]">PaintPricing</span>
          </div>

          {!isLogin && (
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "var(--amber-50)", color: "var(--amber-600)", letterSpacing: "0.04em" }}
            >
              FREE TO START
            </span>
          )}

          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-[var(--muted)] mb-7">
            {isLogin
              ? "Log in to access your quote dashboard."
              : "3 free quote unlocks. No credit card required."}
          </p>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@company.com" required />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Password</Label>
                {isLogin && (
                  <Link className="text-xs font-semibold text-[var(--navy-700)]" href="/forgot-password">
                    Forgot?
                  </Link>
                )}
              </div>
              <Input id="password" name="password" type="password" minLength={8} placeholder="8+ characters" required />
            </div>
            {error && (
              <div className="rounded-[var(--radius)] border border-[var(--danger)]/20 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            )}
            <Button className="w-full mt-2" size="lg" type="submit">
              {isLogin ? "Log in →" : "Create account →"}
            </Button>
          </form>

          <p className="text-center text-sm text-[var(--muted)] mt-5">
            {isLogin ? "Need an account?" : "Already a painter here?"}{" "}
            <Link className="font-semibold text-[var(--navy-700)]" href={isLogin ? "/signup" : "/login"}>
              {isLogin ? "Sign up" : "Log in"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

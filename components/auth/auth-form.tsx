import Link from "next/link";

import { GoogleSignInButton } from "@/components/auth/google-signin-button";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";

type AuthFormProps = {
  mode: "login" | "signup";
  action: (formData: FormData) => Promise<void>;
  error?: string;
  /**
   * Cloudflare Turnstile site key. When provided AND mode === "signup", a
   * Turnstile challenge is rendered above the submit button. When null/empty,
   * the challenge is skipped (graceful degradation).
   */
  turnstileSiteKey?: string | null;
  /**
   * True when the painter arrived from the marketing /calculator/ result
   * panel. Renders a continuity banner so they understand why they need to
   * sign up (to send the estimate as a branded PDF to their client).
   */
  fromCalc?: boolean;
};

const swatchColors = [
  "var(--amber-500)",
  "var(--amber-400)",
  "#C0D4E6",
  "#8FAAC7",
  "#4B6A8B",
  "#2C4C74",
];

export function AuthForm({ mode, action, error, turnstileSiteKey, fromCalc }: AuthFormProps) {
  const isLogin = mode === "login";
  const showTurnstile = !isLogin && Boolean(turnstileSiteKey);
  const showFromCalcBanner = !isLogin && Boolean(fromCalc);

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

          {showFromCalcBanner && (
            <div
              className="mb-5 rounded-[var(--radius)] border px-4 py-3 flex items-start gap-3"
              style={{ background: "var(--amber-50)", borderColor: "var(--amber-100)" }}
            >
              <span
                className="inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-base"
                style={{ background: "var(--amber-500)", color: "#3B2300" }}
                aria-hidden
              >
                ✓
              </span>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)] leading-tight">
                  Estimate ready to send.
                </p>
                <p className="text-xs text-[var(--ink-2)] mt-1 leading-snug">
                  Create a free account to turn your numbers into a branded PDF and email it to your client.
                </p>
              </div>
            </div>
          )}

          {!isLogin && (
            <span
              className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-3"
              style={{ background: "var(--amber-50)", color: "var(--amber-600)", letterSpacing: "0.04em" }}
            >
              FREE TO START
            </span>
          )}

          <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ letterSpacing: "-0.02em" }}>
            {isLogin ? "Welcome back" : (fromCalc ? "Send it as a branded PDF" : "Create your account")}
          </h1>
          <p className="text-sm text-[var(--muted)] mb-7">
            {isLogin
              ? "Log in to access your quote dashboard."
              : "3 free quote unlocks. No credit card required."}
          </p>

          {/* Google sign-in — primary path for tradespeople on phones, no password to remember. */}
          <GoogleSignInButton label={isLogin ? "Continue with Google" : "Sign up with Google"} />

          {/* Divider between OAuth and email/password */}
          <div className="relative my-5" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--line)]"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[var(--background)] px-3 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">
                or with email
              </span>
            </div>
          </div>

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
            {showTurnstile && (
              <div className="pt-1">
                <TurnstileWidget siteKey={turnstileSiteKey ?? null} />
              </div>
            )}
            <SubmitButton
              className="w-full mt-2"
              size="lg"
              pendingLabel={isLogin ? "Logging in…" : "Creating account…"}
            >
              {isLogin ? "Log in →" : "Create account →"}
            </SubmitButton>
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

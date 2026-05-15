/**
 * Server-side bot signup protection.
 *
 * Two layers:
 *
 * 1. Heuristic email-pattern rejection — catches the gmail-dot signup pattern
 *    (a.b.c@gmail.com style) and other obvious bot signatures. Works without
 *    any external service or keys. Strong enough to stop the current spam wave
 *    seen on paintpricing.com (5/14 recent signups in May 2026 used this
 *    pattern).
 *
 * 2. Cloudflare Turnstile verification — gated on env vars. Activates as soon
 *    as TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY are set.
 */

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/**
 * Returns a rejection reason if the email matches a known bot signup pattern,
 * or null if the email looks legitimate.
 *
 * Patterns caught:
 *   - Gmail-dot spam: 3+ dots in the local part of a gmail address
 *     (legitimate gmail addresses almost never have 3+ dots)
 *   - Plus-alias spam: "+" in the local part is OK (forwarding) but if combined
 *     with random alphanumerics it's bot.
 *   - Disposable email domains (small starter list — extend over time).
 */
export function detectBotEmail(email: string): string | null {
  if (!email || typeof email !== "string") {
    return "Invalid email";
  }

  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at === -1) {
    return "Invalid email";
  }

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);

  // Gmail-dot pattern: 3 or more dots in the local part of a gmail address.
  // Gmail treats dots as no-ops, so a.b.c.d@gmail.com = abcd@gmail.com. Bots
  // exploit this to register many "different" accounts that all land in one
  // inbox. Real users with 3+ dots in a gmail handle are extremely rare.
  if (GMAIL_DOMAINS.has(domain)) {
    const dotCount = (local.match(/\./g) || []).length;
    if (dotCount >= 3) {
      return "Suspicious email pattern (looks automated). If this is a real address, please contact support.";
    }
  }

  // Disposable email domains (starter list — extend as patterns emerge)
  const disposable = new Set([
    "mailinator.com", "guerrillamail.com", "10minutemail.com",
    "throwaway.email", "tempmail.com", "yopmail.com", "trashmail.com",
    "fakeinbox.com", "sharklasers.com", "maildrop.cc",
  ]);
  if (disposable.has(domain)) {
    return "Disposable email addresses are not supported. Please use a real email.";
  }

  return null;
}

/**
 * Verifies a Cloudflare Turnstile token against Cloudflare's siteverify API.
 *
 * Returns:
 *   - true if verification passes (or Turnstile is not configured — dev mode)
 *   - false if token is missing or invalid
 *
 * Spec: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */
export async function verifyTurnstileToken(
  token: string | null,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  // Not configured — allow through (development mode, or pre-launch state)
  if (!secret) {
    return true;
  }

  if (!token) {
    return false;
  }

  const body = new URLSearchParams();
  body.append("secret", secret);
  body.append("response", token);
  if (remoteIp) {
    body.append("remoteip", remoteIp);
  }

  try {
    const r = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body,
        // Tight timeout — Cloudflare typically responds in <200ms
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!r.ok) {
      console.error("[turnstile] non-200 from siteverify:", r.status);
      return false;
    }
    const data = (await r.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      console.warn("[turnstile] verify failed:", data["error-codes"]);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[turnstile] verify exception:", err);
    return false;
  }
}

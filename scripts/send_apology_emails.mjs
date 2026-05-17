/**
 * Sends a one-time apology + re-activation email to users who signed up but
 * could not confirm their email because of the cross-device confirmation bug
 * (now fixed). Each email contains a fresh magic link that logs them straight
 * into the app.
 *
 * Recipients: unconfirmed auth users, excluding obvious bots (dotted-gmail
 * spam pattern, disposable domains).
 *
 * Run:
 *   node --env-file=.env.local scripts/send_apology_emails.mjs          # dry run
 *   node --env-file=.env.local scripts/send_apology_emails.mjs send     # actually send
 */
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendKey = process.env.RESEND_API_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://app.paintpricing.com";
if (!url || !key || !resendKey) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / RESEND_API_KEY");
  process.exit(1);
}

const SEND = process.argv[2] === "send";
const supabase = createClient(url, key, { auth: { persistSession: false } });
const resend = new Resend(resendKey);
const FROM = "PaintPricing <hello@paintpricing.com>";

// Disposable / throwaway domains to skip
const DISPOSABLE = ["4heats.com", "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com"];

function isBot(email) {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain) return true;
  if (DISPOSABLE.includes(domain)) return true;
  // gmail-dot spam: 2+ dots in the local part of a gmail address
  if (domain === "gmail.com" && (local.match(/\./g) || []).length >= 2) return true;
  return false;
}

function apologyHtml(magicLink) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px 40px;">
    <div style="margin-bottom:32px;">
      <span style="font-size:20px;font-weight:700;color:#1E3A5F;letter-spacing:-0.3px;">PaintPricing</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.25;">
        We owe you an apology
      </h1>
      <p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6;">
        You signed up for PaintPricing recently, but a technical issue with our
        email confirmation stopped your account from activating. That was on us,
        not you.
      </p>
      <p style="margin:0 0 28px;font-size:16px;color:#475569;line-height:1.6;">
        It is fixed now. Your account is ready and your 3 free quote unlocks are
        waiting. Click below to jump straight in, no password needed.
      </p>
      <a href="${magicLink}"
         style="display:block;text-align:center;background:#F5A623;color:#1E3A5F;font-weight:700;font-size:16px;padding:14px 32px;border-radius:6px;text-decoration:none;">
        Open PaintPricing &rarr;
      </a>
      <p style="margin:20px 0 0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.6;">
        If that link has expired, just sign up again with this same email at
        <a href="https://app.paintpricing.com/signup" style="color:#475569;">app.paintpricing.com/signup</a>.
        It works correctly now.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">
      Thanks for giving us a try. Reply to this email if you have any trouble. We read every one.<br>
      <a href="https://paintpricing.com" style="color:#94A3B8;">paintpricing.com</a>
    </p>
  </div>
</body></html>`;
}

async function fetchUnconfirmed() {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return all.filter((u) => !u.email_confirmed_at);
}

(async () => {
  // Copy mode: send a single viewing copy of the apology email to one address.
  if (process.argv[2] === "copy" && process.argv[3]) {
    const to = process.argv[3];
    await resend.emails.send({
      from: FROM,
      to,
      replyTo: "contact@paintpricing.com",
      subject: "[Copy] We fixed a sign-in issue. Your PaintPricing account is ready.",
      html: apologyHtml("https://app.paintpricing.com/signup"),
    });
    console.log(`Copy sent to ${to}`);
    return;
  }

  const unconfirmed = await fetchUnconfirmed();
  const recipients = unconfirmed.filter((u) => !isBot(u.email));
  const skipped = unconfirmed.filter((u) => isBot(u.email));

  console.log(`Unconfirmed users: ${unconfirmed.length}`);
  console.log(`  -> recipients (real): ${recipients.length}`);
  console.log(`  -> skipped (bot/disposable): ${skipped.length}`);
  console.log();
  console.log("Recipients:");
  for (const u of recipients) console.log(`  ${u.created_at.slice(0, 10)}  ${u.email}`);
  console.log();
  console.log("Skipped as bots:");
  for (const u of skipped) console.log(`  ${u.email}`);
  console.log();

  if (!SEND) {
    console.log("DRY RUN. Re-run with `send` to actually send the apology emails.");
    return;
  }

  let ok = 0, fail = 0;
  for (const u of recipients) {
    try {
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: u.email,
        options: { redirectTo: `${siteUrl}/dashboard` },
      });
      if (error) throw error;
      const hashed = data.properties?.hashed_token;
      const magicLink = `${siteUrl}/auth/callback?token_hash=${hashed}&type=magiclink&next=/dashboard`;

      await resend.emails.send({
        from: FROM,
        to: u.email,
        replyTo: "contact@paintpricing.com",
        subject: "We fixed a sign-in issue. Your PaintPricing account is ready.",
        html: apologyHtml(magicLink),
      });
      console.log(`  SENT  ${u.email}`);
      ok += 1;
    } catch (e) {
      console.log(`  FAIL  ${u.email}  ${e.message}`);
      fail += 1;
    }
  }
  console.log(`\nDone. Sent: ${ok}  Failed: ${fail}`);
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });

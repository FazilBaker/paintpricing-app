/**
 * One-off backfill: emails a friendly "build your first quote" reminder to
 * users who confirmed their email but have never built a single quote.
 *
 * The ongoing version of this nudge runs automatically via the drip cron
 * (app/api/cron/drip). This script is just for the existing backlog of
 * already-confirmed users who predate the drip.
 *
 * Run:
 *   node --env-file=.env.local scripts/send_activation_reminders.mjs        # dry run
 *   node --env-file=.env.local scripts/send_activation_reminders.mjs send   # send
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

const DISPOSABLE = ["4heats.com", "tatefarm.com", "mailinator.com", "guerrillamail.com", "tempmail.com", "10minutemail.com"];

function isJunk(email) {
  const [local, domain] = email.toLowerCase().split("@");
  if (!domain) return true;
  if (DISPOSABLE.includes(domain)) return true;
  if (domain === "gmail.com" && (local.match(/\./g) || []).length >= 2) return true;
  if (local.includes("test") || local.includes("testacc")) return true;
  if (domain === "323.media") return true; // internal test domain
  return false;
}

function reminderHtml(magicLink) {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;padding:0 16px 40px;">
    <div style="margin-bottom:32px;">
      <span style="font-size:20px;font-weight:700;color:#1E3A5F;letter-spacing:-0.3px;">PaintPricing</span>
    </div>
    <div style="background:#ffffff;border-radius:12px;padding:40px 36px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
      <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.25;">
        Your first quote takes 60 seconds
      </h1>
      <p style="margin:0 0 16px;font-size:16px;color:#475569;line-height:1.6;">
        You set up your PaintPricing account but have not built a quote yet.
        It is quick: pick a room, enter a few numbers, hit save. We turn it into
        a branded PDF you can send straight from the job site.
      </p>
      <p style="margin:0 0 28px;font-size:16px;color:#475569;line-height:1.6;">
        You still have 3 free quote unlocks waiting. Click below to build your
        first one, no password needed.
      </p>
      <a href="${magicLink}"
         style="display:block;text-align:center;background:#F5A623;color:#1E3A5F;font-weight:700;font-size:16px;padding:14px 32px;border-radius:6px;text-decoration:none;">
        Build my first quote &rarr;
      </a>
      <p style="margin:20px 0 0;font-size:13px;color:#94A3B8;text-align:center;line-height:1.6;">
        If that link has expired, log in any time at
        <a href="https://app.paintpricing.com/login" style="color:#475569;">app.paintpricing.com</a>.
      </p>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#94A3B8;text-align:center;line-height:1.6;">
      Reply to this email if anything is unclear. We read every one.<br>
      <a href="https://paintpricing.com" style="color:#94A3B8;">paintpricing.com</a>
    </p>
  </div>
</body></html>`;
}

async function fetchUsers() {
  const all = [];
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return all;
}

(async () => {
  const users = await fetchUsers();
  const { data: quotes, error } = await supabase.from("quotes").select("user_id");
  if (error) throw error;
  const withQuote = new Set(quotes.map((q) => q.user_id));

  const confirmedNoQuote = users.filter((u) => u.email_confirmed_at && !withQuote.has(u.id));
  const recipients = confirmedNoQuote.filter((u) => !isJunk(u.email));
  const skipped = confirmedNoQuote.filter((u) => isJunk(u.email));

  console.log(`Confirmed + never built a quote: ${confirmedNoQuote.length}`);
  console.log(`  -> recipients (real): ${recipients.length}`);
  console.log(`  -> skipped (test/disposable): ${skipped.length}`);
  console.log();
  console.log("Recipients:");
  for (const u of recipients) console.log(`  ${u.created_at.slice(0, 10)}  ${u.email}`);
  console.log("Skipped:");
  for (const u of skipped) console.log(`  ${u.email}`);
  console.log();

  if (!SEND) {
    console.log("DRY RUN. Re-run with `send` to actually send.");
    return;
  }

  let ok = 0, fail = 0;
  for (const u of recipients) {
    try {
      const { data, error: glErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: u.email,
        options: { redirectTo: `${siteUrl}/quotes/new` },
      });
      if (glErr) throw glErr;
      const magicLink = `${siteUrl}/auth/callback?token_hash=${data.properties?.hashed_token}&type=magiclink&next=/quotes/new`;
      await resend.emails.send({
        from: FROM,
        to: u.email,
        replyTo: "contact@paintpricing.com",
        subject: "Your PaintPricing account is ready. Build your first quote.",
        html: reminderHtml(magicLink),
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

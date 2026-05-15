/**
 * Measures the signup -> email-confirmed funnel in Supabase.
 *
 * Queries auth.users via the admin client and reports:
 *   - Total signups in the last 7/14/30 days
 *   - How many of those had email_confirmed_at populated
 *   - Conversion %
 *   - Recent unconfirmed signups (top 20 most recent) for spot-check
 *
 * Run:
 *   $env:NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"
 *   node scripts/check_signup_funnel.mjs
 *
 * Or just `node` it from a context where Vercel env vars are loaded.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

async function fetchAllUsers() {
  const all = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    all.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return all;
}

function bucket(users, sinceDays) {
  const since = daysAgo(sinceDays);
  const matched = users.filter((u) => u.created_at >= since);
  const confirmed = matched.filter((u) => u.email_confirmed_at);
  const unconfirmed = matched.filter((u) => !u.email_confirmed_at);
  return {
    total: matched.length,
    confirmed: confirmed.length,
    unconfirmed: unconfirmed.length,
    rate: matched.length ? (confirmed.length / matched.length) : 0,
    unconfirmedSample: unconfirmed.slice(0, 5).map((u) => ({
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
    })),
  };
}

(async () => {
  console.log("Fetching all auth users...");
  const users = await fetchAllUsers();
  console.log(`Total auth users in database: ${users.length}`);
  console.log();

  for (const days of [1, 7, 14, 30, 90]) {
    const b = bucket(users, days);
    const pct = (b.rate * 100).toFixed(1);
    console.log(`Last ${days.toString().padStart(2)} days:  ${b.total.toString().padStart(4)} signups  ` +
                `|  ${b.confirmed.toString().padStart(3)} confirmed  ` +
                `|  ${b.unconfirmed.toString().padStart(3)} unconfirmed  ` +
                `|  ${pct}% conversion`);
  }

  console.log();
  console.log("--- Recent unconfirmed signups (last 7 days, top 20 by created_at desc) ---");
  const recent = users
    .filter((u) => u.created_at >= daysAgo(7) && !u.email_confirmed_at)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 20);
  for (const u of recent) {
    const ageDays = ((Date.now() - new Date(u.created_at).getTime()) / 86400000).toFixed(1);
    console.log(`  ${u.created_at}  ${ageDays.padStart(4)}d ago  ${u.email}`);
  }

  console.log();
  console.log("Interpretation guide:");
  console.log("  > 80% conversion = healthy. Probably no widespread bug.");
  console.log("  60-80%           = expected baseline with cross-device drop-off + spam folder.");
  console.log("  < 60%            = problematic. Check Resend delivery logs + Supabase Auth logs.");
  console.log("  < 30%            = something is structurally broken (deliverability or callback).");
})().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});

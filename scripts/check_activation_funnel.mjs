/**
 * Measures the FULL activation funnel: signup -> confirmed -> onboarded ->
 * first quote -> unlocked (used) a free quote.
 *
 * Answers: "people sign up but don't use the free quotes - where do they drop?"
 *
 * Run:
 *   node --env-file=.env.local scripts/check_activation_funnel.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
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
  console.log("Fetching auth users, profiles, quotes...\n");
  const users = await fetchAllUsers();

  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, rates_configured_at, free_quotes_used, billing_status, created_at");
  if (pErr) throw pErr;

  const { data: quotes, error: qErr } = await supabase
    .from("quotes")
    .select("user_id, is_unlocked, created_at");
  if (qErr) throw qErr;

  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const quotesByUser = new Map();
  for (const q of quotes) {
    if (!quotesByUser.has(q.user_id)) quotesByUser.set(q.user_id, []);
    quotesByUser.get(q.user_id).push(q);
  }

  for (const days of [7, 30, 90]) {
    const since = daysAgo(days);
    const cohort = users.filter((u) => u.created_at >= since);
    const confirmed = cohort.filter((u) => u.email_confirmed_at);
    const hasProfile = confirmed.filter((u) => profileById.has(u.id));
    const onboarded = confirmed.filter((u) => profileById.get(u.id)?.rates_configured_at);
    const builtQuote = confirmed.filter((u) => (quotesByUser.get(u.id) || []).length > 0);
    const unlockedQuote = confirmed.filter((u) =>
      (quotesByUser.get(u.id) || []).some((q) => q.is_unlocked));
    const paid = confirmed.filter((u) => {
      const bs = profileById.get(u.id)?.billing_status;
      return bs && bs !== "free" && bs !== "none";
    });

    const pct = (n) => cohort.length ? `${((n / cohort.length) * 100).toFixed(0)}%` : "-";
    console.log(`==== Last ${days} days ====`);
    console.log(`  Signed up .................. ${cohort.length}`);
    console.log(`  Confirmed email ............ ${confirmed.length}  (${pct(confirmed.length)})`);
    console.log(`  Profile row exists ......... ${hasProfile.length}  (${pct(hasProfile.length)})`);
    console.log(`  Completed onboarding ....... ${onboarded.length}  (${pct(onboarded.length)})`);
    console.log(`  Built >=1 quote ............ ${builtQuote.length}  (${pct(builtQuote.length)})`);
    console.log(`  Unlocked (used) a quote .... ${unlockedQuote.length}  (${pct(unlockedQuote.length)})`);
    console.log(`  Paid ....................... ${paid.length}  (${pct(paid.length)})`);
    console.log();
  }

  // Drop-off detail: confirmed users in last 30d who never built a quote
  const since30 = daysAgo(30);
  const stuck = users
    .filter((u) => u.created_at >= since30 && u.email_confirmed_at)
    .filter((u) => (quotesByUser.get(u.id) || []).length === 0)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  console.log(`--- Confirmed last 30d but NEVER built a quote: ${stuck.length} ---`);
  for (const u of stuck.slice(0, 20)) {
    const p = profileById.get(u.id);
    const stage = !p ? "NO PROFILE ROW"
      : !p.rates_configured_at ? "stopped at onboarding"
      : "onboarded, no quote";
    console.log(`  ${u.created_at.slice(0, 10)}  ${u.email.padEnd(34)}  ${stage}`);
  }
})().catch((e) => { console.error("Error:", e.message); process.exit(1); });

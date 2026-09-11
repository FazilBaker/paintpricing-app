/**
 * Activation and revenue funnel, straight from Supabase.
 *
 * PostHog would show where inside the onboarding wizard people bail, but the only PostHog key in
 * .env.local is NEXT_PUBLIC_POSTHOG_KEY, which is the project WRITE key. Querying insights needs a
 * personal API key (phx_...), which is not here. Supabase has the service role key and holds the
 * authoritative state anyway: what PostHog infers from events, profiles.rates_configured_at and
 * quotes.is_unlocked simply record.
 *
 * Read only. No writes, no mutations. Emails are printed only for the handful of users who are at
 * or near the free cap, because those are the ones worth acting on individually.
 *
 * Run: node scripts/funnel.mjs
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env.local");
const env = Object.fromEntries(
  fs.readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("missing SUPABASE url or service role key in .env.local");
  process.exit(1);
}

const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

async function rest(pathname, params = "") {
  const r = await fetch(`${URL}/rest/v1/${pathname}${params}`, { headers: H });
  if (!r.ok) throw new Error(`${pathname}: ${r.status} ${await r.text()}`);
  return r.json();
}

async function authUsers() {
  const out = [];
  for (let page = 1; page < 20; page++) {
    const r = await fetch(`${URL}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H });
    if (!r.ok) throw new Error(`auth users: ${r.status} ${await r.text()}`);
    const j = await r.json();
    const users = j.users ?? [];
    out.push(...users);
    if (users.length < 200) break;
  }
  return out;
}

const users = await authUsers();
const profiles = await rest("profiles", "?select=*");
const quotes = await rest("quotes", "?select=id,user_id,total,is_unlocked,share_token,created_at,pdf_url");

const byId = new Map(profiles.map((p) => [p.id, p]));
const quotesByUser = new Map();
for (const q of quotes) {
  if (!quotesByUser.has(q.user_id)) quotesByUser.set(q.user_id, []);
  quotesByUser.get(q.user_id).push(q);
}

// A signup with no confirmation and no profile row is almost always a bot or a typo, so the
// funnel is reported against confirmed users as well as against raw signups.
const confirmed = users.filter((u) => u.email_confirmed_at);
const configured = profiles.filter((p) => p.rates_configured_at);
const withQuote = [...quotesByUser.keys()];
const unlockedUsers = new Set(quotes.filter((q) => q.is_unlocked).map((q) => q.user_id));
const sharedUsers = new Set(quotes.filter((q) => q.share_token).map((q) => q.user_id));
const paying = profiles.filter((p) => p.billing_status === "active");
const ltd = profiles.filter((p) => p.lifetime_deal_claimed_at);

const pct = (n, d) => (d ? ((100 * n) / d).toFixed(0) + "%" : "-");

console.log("\n" + "=".repeat(72));
console.log("ACTIVATION FUNNEL");
console.log("=".repeat(72));
const rows = [
  ["signed up", users.length],
  ["confirmed email", confirmed.length],
  ["configured rates", configured.length],
  ["built a quote", withQuote.length],
  ["unlocked a quote (spent a credit)", unlockedUsers.size],
  ["shared a quote (sent to a client)", sharedUsers.size],
  ["paying (active sub)", paying.length],
  ["lifetime deal", ltd.length],
];
let prev = users.length;
for (const [label, n] of rows) {
  console.log(
    `  ${label.padEnd(36)} ${String(n).padStart(4)}   ${pct(n, users.length).padStart(4)} of signups   ${pct(n, prev).padStart(4)} of previous step`,
  );
  prev = n;
}

console.log("\n" + "=".repeat(72));
console.log("WHERE THE DROP HAPPENS");
console.log("=".repeat(72));
const neverConfirmed = users.filter((u) => !u.email_confirmed_at).length;
const confirmedNotConfigured = confirmed.filter((u) => !byId.get(u.id)?.rates_configured_at).length;
const configuredNoQuote = configured.filter((p) => !quotesByUser.has(p.id)).length;
const quoteNotUnlocked = withQuote.filter((id) => !unlockedUsers.has(id)).length;
console.log(`  signed up, never confirmed email      ${String(neverConfirmed).padStart(4)}`);
console.log(`  confirmed, never configured rates     ${String(confirmedNotConfigured).padStart(4)}`);
console.log(`  configured, never built a quote       ${String(configuredNoQuote).padStart(4)}`);
console.log(`  built a quote, never unlocked one     ${String(quoteNotUnlocked).padStart(4)}`);

console.log("\n" + "=".repeat(72));
console.log("QUOTES");
console.log("=".repeat(72));
const unlocked = quotes.filter((q) => q.is_unlocked);
const value = quotes.reduce((a, q) => a + Number(q.total || 0), 0);
console.log(`  quotes created            ${quotes.length}`);
console.log(`  unlocked                  ${unlocked.length}`);
console.log(`  shared with a client      ${quotes.filter((q) => q.share_token).length}`);
console.log(`  total quote value         $${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

console.log("\n" + "=".repeat(72));
console.log("AT OR NEAR THE FREE CAP  (the paid-conversion candidates)");
console.log("=".repeat(72));
const near = profiles
  .filter((p) => p.billing_status !== "active" && p.free_quotes_used >= p.free_quotes_limit - 1)
  .sort((a, b) => b.free_quotes_used - a.free_quotes_used);
if (!near.length) {
  console.log("  nobody is within one quote of the cap yet");
} else {
  for (const p of near) {
    const u = users.find((x) => x.id === p.id);
    const qs = quotesByUser.get(p.id) ?? [];
    const v = qs.reduce((a, q) => a + Number(q.total || 0), 0);
    console.log(
      `  ${(p.business_name || "(no business name)").slice(0, 26).padEnd(28)} ${String(p.free_quotes_used)}/${p.free_quotes_limit} used` +
        `   ${String(qs.length).padStart(2)} quotes   $${String(Math.round(v)).padStart(7)}   ${u?.email ?? "?"}`,
    );
  }
}

console.log("\n" + "=".repeat(72));
console.log("SIGNUPS BY WEEK");
console.log("=".repeat(72));
const weeks = new Map();
for (const u of users) {
  const d = new Date(u.created_at);
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  const k = monday.toISOString().slice(0, 10);
  weeks.set(k, (weeks.get(k) ?? 0) + 1);
}
for (const k of [...weeks.keys()].sort()) {
  console.log(`  ${k}  ${"#".repeat(weeks.get(k))} ${weeks.get(k)}`);
}
console.log();

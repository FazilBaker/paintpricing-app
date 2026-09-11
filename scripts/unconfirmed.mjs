/**
 * Are the 32 unconfirmed signups real people or bots?
 *
 * The answer decides the fix. Bots mean the number is vanity and the funnel should be read
 * against confirmed users only. Real people mean a deliverability problem worth real money,
 * since every one of them is a painter who wanted the tool and never got in.
 *
 * Read only.
 */
import fs from "node:fs";
import path from "node:path";
import { detectBotEmail } from "../lib/bot-protection.ts";

const env = Object.fromEntries(
  fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8")
    .split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const URL = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

const out = [];
for (let page = 1; page < 20; page++) {
  const r = await fetch(`${URL}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: H });
  const j = await r.json();
  out.push(...(j.users ?? []));
  if ((j.users ?? []).length < 200) break;
}
const un = out.filter((u) => !u.email_confirmed_at);
console.log(`unconfirmed: ${un.length} of ${out.length}\n`);

let botish = 0;
const freeMail = /gmail|yahoo|hotmail|outlook|icloud|aol|proton/i;
const rows = [];
for (const u of un) {
  const e = (u.email || "").toLowerCase();
  const local = e.split("@")[0] || "";
  const domain = e.split("@")[1] || "";
  const dots = (local.match(/\./g) || []).length;
  const digits = (local.match(/\d/g) || []).length;
  // signals, not proof
  const flags = [];
  if (dots >= 3) flags.push("3+dots");
  if (digits >= 5) flags.push("many-digits");
  if (/^[a-z]{16,}$/.test(local)) flags.push("long-random");
  if (!freeMail.test(domain) && !domain.includes(".")) flags.push("odd-domain");
  if (flags.length) botish++;
  rows.push({ e, domain, flags, when: (u.created_at || "").slice(0, 10) });
}
console.log(`showing bot signals (heuristic, not proof):`);
for (const r of rows) {
  console.log(`  ${r.when}  ${r.e.padEnd(38)} ${r.flags.join(",") || "-- looks human --"}`);
}
console.log(`\nflagged by at least one signal: ${botish} / ${un.length}`);
const byDomain = {};
for (const r of rows) byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
console.log("\nunconfirmed by domain:");
for (const [d, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) console.log(`  ${d.padEnd(28)} ${n}`);

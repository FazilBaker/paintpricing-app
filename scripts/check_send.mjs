import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
const recent = data.users
  .filter((u) => !u.email_confirmed_at)
  .sort((a, b) => b.created_at.localeCompare(a.created_at))
  .slice(0, 10);

console.log(`${'created_at'.padEnd(28)} ${'confirmation_sent_at'.padEnd(28)} email`);
console.log('-'.repeat(110));
for (const u of recent) {
  const sent = u.confirmation_sent_at || '<<NULL — email never sent>>';
  console.log(`${u.created_at.padEnd(28)} ${sent.padEnd(28)} ${u.email}`);
}

console.log();
const ratioSent = recent.filter(u => u.confirmation_sent_at).length;
console.log(`${ratioSent}/${recent.length} unconfirmed users had confirmation_sent_at populated.`);
console.log("If 100%, Supabase is sending the email — drop-off is in delivery or callback.");
console.log("If <100%, Supabase is NOT sending the email — SMTP/Resend integration is broken.");

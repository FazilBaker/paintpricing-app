import { NextResponse } from "next/server";

import { detectBotEmail } from "@/lib/bot-protection";
import { sendConfirmReminderEmail, sendTryItReminderEmail } from "@/lib/email";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Activation drip. Triggered once a day by Vercel Cron (see vercel.json).
 *
 * Two reminders, each sent exactly once per user via a 24h time window so no
 * per-user tracking table is needed:
 *
 *   1. Confirm reminder  - user signed up but never confirmed their email.
 *      Sent on the daily run that falls 24-48h after signup.
 *
 *   2. Try-it reminder   - user confirmed their email but never built a quote.
 *      Sent on the daily run that falls 48-72h after confirmation.
 *
 * Because the job runs daily and each window is 24h wide, a given user lands
 * in each window for exactly one run.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. The route
 * rejects anything else, so it cannot be triggered by the public.
 */

const HOUR = 60 * 60 * 1000;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://app.paintpricing.com";

async function listAllUsers(
  admin: ReturnType<typeof createSupabaseAdminClient>,
) {
  const all: { id: string; email?: string; created_at: string; email_confirmed_at?: string }[] = [];
  let page = 1;
  while (admin) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    all.push(...(data.users as typeof all));
    if (data.users.length < 1000) break;
    page += 1;
  }
  return all;
}

async function magicLink(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  email: string,
  next: string,
) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${SITE_URL}${next}` },
  });
  if (error || !data.properties?.hashed_token) return null;
  return `${SITE_URL}/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`;
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const now = Date.now();
  const users = await listAllUsers(admin);

  const { data: quotes } = await admin.from("quotes").select("user_id");
  const usersWithQuote = new Set((quotes ?? []).map((q) => q.user_id));

  const result = { confirmReminders: 0, tryItReminders: 0, skippedBots: 0, errors: 0 };

  for (const u of users) {
    if (!u.email) continue;
    if (detectBotEmail(u.email)) {
      result.skippedBots += 1;
      continue;
    }
    const createdAge = now - new Date(u.created_at).getTime();

    // 1. Confirm reminder: unconfirmed, 24-48h after signup
    if (!u.email_confirmed_at && createdAge >= 24 * HOUR && createdAge < 48 * HOUR) {
      try {
        const link = await magicLink(admin, u.email, "/dashboard");
        if (link) {
          await sendConfirmReminderEmail(u.email, link);
          result.confirmReminders += 1;
        }
      } catch {
        result.errors += 1;
      }
      continue;
    }

    // 2. Try-it reminder: confirmed 48-72h ago, never built a quote
    if (u.email_confirmed_at && !usersWithQuote.has(u.id)) {
      const confirmedAge = now - new Date(u.email_confirmed_at).getTime();
      if (confirmedAge >= 48 * HOUR && confirmedAge < 72 * HOUR) {
        try {
          const link = await magicLink(admin, u.email, "/quotes/new");
          if (link) {
            await sendTryItReminderEmail(u.email, link);
            result.tryItReminders += 1;
          }
        } catch {
          result.errors += 1;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...result });
}

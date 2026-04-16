export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function isPaypalConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
      process.env.NEXT_PUBLIC_PAYPAL_PLAN_MONTHLY &&
      process.env.NEXT_PUBLIC_PAYPAL_PLAN_YEARLY,
  );
}

export function isPaypalServerConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID &&
      process.env.PAYPAL_CLIENT_SECRET &&
      process.env.PAYPAL_WEBHOOK_ID,
  );
}

export function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

import { getRequiredEnv } from "@/lib/env";

// Live or sandbox. This used to key on NODE_ENV alone, but Vercel builds preview deployments with
// NODE_ENV=production too, so every preview talked to LIVE PayPal and could take real money.
//
// Order of precedence:
//   PAYPAL_ENV=live|sandbox   explicit override, always wins
//   VERCEL_ENV=preview|development  sandbox
//   NODE_ENV!=production      sandbox (local dev)
//   otherwise                 live, which keeps production on Vercel AND any non-Vercel host live.
// Failing toward live on an unknown host is deliberate: failing toward sandbox in production would
// silently break every real purchase, which is the worse of the two errors.
function usePaypalSandbox(): boolean {
  const explicit = process.env.PAYPAL_ENV;
  if (explicit === "sandbox") return true;
  if (explicit === "live") return false;
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === "preview" || vercelEnv === "development") return true;
  return process.env.NODE_ENV !== "production";
}

const PAYPAL_API_BASE = usePaypalSandbox()
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const clientId = getRequiredEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID");
  const secret = getRequiredEnv("PAYPAL_CLIENT_SECRET");
  const credentials = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`PayPal OAuth2 token request failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return cachedToken.token;
}

export async function verifyWebhookSignature(
  headers: Headers,
  rawBody: string,
): Promise<boolean> {
  const webhookId = getRequiredEnv("PAYPAL_WEBHOOK_ID");
  const token = await getAccessToken();

  const transmissionId = headers.get("paypal-transmission-id");
  const transmissionTime = headers.get("paypal-transmission-time");
  const transmissionSig = headers.get("paypal-transmission-sig");
  const certUrl = headers.get("paypal-cert-url");
  const authAlgo = headers.get("paypal-auth-algo");

  if (!transmissionId || !transmissionTime || !transmissionSig || !certUrl || !authAlgo) {
    return false;
  }

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    },
  );

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { verification_status: string };
  return data.verification_status === "SUCCESS";
}

export async function captureOrder(orderId: string): Promise<{
  ok: boolean;
  amount?: number;
  payerId?: string;
  error?: string;
}> {
  const token = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, error: `Capture failed: ${response.status} ${text}` };
  }

  const data = (await response.json()) as {
    status: string;
    payer?: { payer_id?: string };
    purchase_units?: Array<{
      payments?: {
        captures?: Array<{
          amount?: { value?: string };
        }>;
      };
    }>;
  };

  if (data.status !== "COMPLETED") {
    return { ok: false, error: `Order status is ${data.status}, not COMPLETED` };
  }

  const capturedAmount = Number(
    data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? "0",
  );

  return {
    ok: true,
    amount: capturedAmount,
    payerId: data.payer?.payer_id,
  };
}

export async function verifySubscription(subscriptionId: string): Promise<{
  ok: boolean;
  status?: string;
  planId?: string;
  customId?: string;
  payerId?: string;
  error?: string;
}> {
  const token = await getAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v1/billing/subscriptions/${subscriptionId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    return { ok: false, error: `Subscription check failed: ${response.status}` };
  }

  const data = (await response.json()) as {
    status: string;
    plan_id?: string;
    custom_id?: string;
    subscriber?: { payer_id?: string };
  };

  if (data.status !== "ACTIVE") {
    return { ok: false, status: data.status, error: `Subscription is ${data.status}` };
  }

  return {
    ok: true,
    status: data.status,
    planId: data.plan_id,
    customId: data.custom_id,
    payerId: data.subscriber?.payer_id,
  };
}

/** Parse "userId:cycle" from PayPal custom_id field */
export function parseCustomId(customId: string): {
  userId: string;
  cycle: string;
} | null {
  const parts = customId.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }
  return { userId: parts[0], cycle: parts[1] };
}

/**
 * Read an order WITHOUT capturing it, so its amount, currency and owner can be checked before
 * any money moves. The lifetime order is created in the browser, so every field on it is
 * attacker-controlled until PayPal reports it back to us here.
 */
export async function getOrder(orderId: string): Promise<{
  ok: boolean;
  amount?: number;
  currency?: string;
  customId?: string;
  error?: string;
}> {
  const token = await getAccessToken();
  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!response.ok) {
    return { ok: false, error: `Order lookup failed: ${response.status}` };
  }
  const data = (await response.json()) as {
    purchase_units?: Array<{ custom_id?: string; amount?: { value?: string; currency_code?: string } }>;
  };
  const unit = data.purchase_units?.[0];
  return {
    ok: true,
    amount: Number(unit?.amount?.value ?? "0"),
    currency: unit?.amount?.currency_code,
    customId: unit?.custom_id,
  };
}

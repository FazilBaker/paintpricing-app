import { getRequiredEnv } from "@/lib/env";

const PAYPAL_API_BASE = process.env.NODE_ENV === "production"
  ? "https://api-m.paypal.com"
  : "https://api-m.sandbox.paypal.com";

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
    subscriber?: { payer_id?: string };
  };

  if (data.status !== "ACTIVE") {
    return { ok: false, status: data.status, error: `Subscription is ${data.status}` };
  }

  return {
    ok: true,
    status: data.status,
    planId: data.plan_id,
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

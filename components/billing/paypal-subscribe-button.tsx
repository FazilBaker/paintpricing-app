"use client";

import { useMemo, useState, useTransition } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

import type { BillingCycle } from "@/lib/types";

type PayPalSubscribeButtonProps = {
  cycle: BillingCycle;
  clientId: string;
  planId?: string;
  amount?: string;
  userId: string;
};

export function PayPalSubscribeButton({
  cycle,
  clientId,
  planId,
  amount,
  userId,
}: PayPalSubscribeButtonProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const options = useMemo(
    () => ({
      clientId,
      vault: true,
      intent: "subscription",
    }),
    [clientId],
  );

  return (
    <div className="space-y-3">
      <PayPalScriptProvider options={options}>
        <PayPalButtons
          style={{
            layout: "vertical",
            shape: "pill",
            label: cycle === "lifetime" ? "pay" : "subscribe",
          }}
          createSubscription={
            cycle === "lifetime" || !planId
              ? undefined
              : (_, actions) =>
                  actions.subscription.create({
                    plan_id: planId,
                    custom_id: `${userId}:${cycle}`,
                  })
          }
          createOrder={
            cycle !== "lifetime" || !amount
              ? undefined
              : (_, actions) =>
                  actions.order.create({
                    intent: "CAPTURE",
                    purchase_units: [
                      {
                        amount: {
                          currency_code: "USD",
                          value: amount,
                        },
                        custom_id: `${userId}:lifetime`,
                        description: "PaintPricing lifetime launch deal",
                      },
                    ],
                  })
          }
          onApprove={async (data) => {
            startTransition(async () => {
              if (cycle === "lifetime") {
                const response = await fetch("/api/paypal/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderID: data.orderID }),
                });

                if (response.ok) {
                  window.location.href = "/dashboard";
                  return;
                }

                const result = await response.json();
                setMessage(result.error || "Lifetime payment failed. Please contact support.");
                return;
              }

              const response = await fetch("/api/paypal/activate-subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  subscriptionID: data.subscriptionID,
                  cycle,
                }),
              });

              if (response.ok) {
                window.location.href = "/dashboard";
                return;
              }

              const result = await response.json();
              setMessage(result.error || "Subscription activation failed. Please contact support.");
            });
          }}
        />
      </PayPalScriptProvider>
      {isPending ? (
        <p className="text-sm text-[var(--muted)]">
          Confirming your payment and unlocking the dashboard...
        </p>
      ) : null}
      {message ? <p className="text-sm text-[var(--danger)]">{message}</p> : null}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";

type PayPalSubscribeButtonProps = {
  cycle: "monthly" | "yearly";
  clientId: string;
  planId?: string;
  userId: string;
};

export function PayPalSubscribeButton({
  cycle,
  clientId,
  planId,
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
            label: "subscribe",
          }}
          createSubscription={
            !planId
              ? undefined
              : (_, actions) =>
                  actions.subscription.create({
                    plan_id: planId,
                    custom_id: `${userId}:${cycle}`,
                  })
          }
          onApprove={async (data) => {
            startTransition(async () => {
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

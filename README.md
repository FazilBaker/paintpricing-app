# PaintPricing.com

Fast quote PDFs for solo interior repaint painters.

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Supabase auth + Postgres + Storage
- PayPal Subscriptions
- `@react-pdf/renderer`
- PWA manifest + service worker

## Local Setup

1. Copy `.env.example` to `.env.local`.
2. Add your Supabase and PayPal values.
3. Run the SQL in `supabase/schema.sql`.
4. Start the app:

```bash
npm install
npm run dev
```

## Required Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
NEXT_PUBLIC_PAYPAL_MONTHLY_PLAN_ID=
NEXT_PUBLIC_PAYPAL_YEARLY_PLAN_ID=
```

## Product Assumptions Locked Into This MVP

- No tool access before payment.
- 14-day money-back guarantee is a policy, not a free trial.
- One guarantee per customer/business/payment profile.
- Room templates use conservative 2026 production-rate defaults.
- Quote PDFs are regenerated from stored quote data on demand.

## Hostinger Deployment

1. Push this project to GitHub.
2. In Hostinger hPanel, create a Node.js Web App and connect the GitHub repo.
3. Set the Node version to a current LTS release supported by Hostinger.
4. Set the build command to `npm install && npm run build`.
5. Set the start command to `npm run start`.
6. Add the same environment variables from `.env.local` to Hostinger.
7. Redeploy after saving environment variables.

The app uses standalone output and a small start wrapper so Hostinger can run the built server with `$PORT` while local Windows development still works cleanly.

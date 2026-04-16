import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { LIFETIME_DEAL_LIMIT } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type UserRow = {
  id: string;
  business_name: string | null;
  business_email: string | null;
  phone: string | null;
  billing_status: string;
  billing_cycle: string | null;
  free_quotes_used: number;
  free_quotes_limit: number;
  rates_configured_at: string | null;
  lifetime_deal_claimed_at: string | null;
  created_at: string;
};

type QuoteStats = {
  user_id: string;
  count: number;
  total_revenue: number;
  latest_at: string | null;
};

function statusColor(status: string) {
  switch (status) {
    case "active":
      return "bg-[var(--success-soft)] text-[var(--success)]";
    case "past_due":
      return "bg-[var(--warning-soft)] text-[var(--warning)]";
    case "canceled":
    case "refunded":
      return "bg-[var(--danger-soft)] text-[var(--danger)]";
    default:
      return "bg-[var(--brand-soft)] text-[var(--brand)]";
  }
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateShort(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function AdminPage() {
  const viewer = await getViewer();

  if (!viewer.user || !isAdmin(viewer.user.email)) {
    redirect("/dashboard");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return (
      <main className="container-shell py-6">
        <p className="text-[var(--danger)]">Service role key not configured.</p>
      </main>
    );
  }

  // Fetch all profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select(
      "id, business_name, business_email, phone, billing_status, billing_cycle, free_quotes_used, free_quotes_limit, rates_configured_at, lifetime_deal_claimed_at, created_at",
    )
    .order("created_at", { ascending: false });

  const users: UserRow[] = (profiles ?? []) as UserRow[];

  // Fetch user emails from auth.users
  const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUsers = authData?.users ?? [];
  const emailMap = new Map<string, string>();
  for (const u of authUsers) {
    emailMap.set(u.id, u.email ?? "");
  }

  // Fetch quote counts per user
  const { data: quotesRaw } = await admin
    .from("quotes")
    .select("user_id, total, created_at");

  const quoteStatsMap = new Map<string, QuoteStats>();
  for (const q of quotesRaw ?? []) {
    const existing = quoteStatsMap.get(q.user_id);
    if (existing) {
      existing.count += 1;
      existing.total_revenue += Number(q.total);
      if (!existing.latest_at || q.created_at > existing.latest_at) {
        existing.latest_at = q.created_at;
      }
    } else {
      quoteStatsMap.set(q.user_id, {
        user_id: q.user_id,
        count: 1,
        total_revenue: Number(q.total),
        latest_at: q.created_at,
      });
    }
  }

  // Compute stats
  const totalUsers = users.length;
  const configuredUsers = users.filter((u) => u.rates_configured_at).length;
  const activeSubscribers = users.filter((u) => u.billing_status === "active").length;
  const lifetimeSold = users.filter(
    (u) => u.billing_cycle === "lifetime" && u.billing_status === "active",
  ).length;
  const totalQuotes = quotesRaw?.length ?? 0;

  // Revenue estimate
  const monthlyCount = users.filter(
    (u) => u.billing_cycle === "monthly" && u.billing_status === "active",
  ).length;
  const yearlyCount = users.filter(
    (u) => u.billing_cycle === "yearly" && u.billing_status === "active",
  ).length;
  const ltdRevenue = lifetimeSold * 249;
  const mrr = monthlyCount * 29 + Math.round((yearlyCount * 299) / 12);

  return (
    <main className="container-shell py-6 pb-20">
      <div className="mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {totalUsers} users · {totalQuotes} quotes · Updated just now
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Users</p>
            <p className="mt-1 text-2xl font-bold font-mono">{totalUsers}</p>
            <p className="text-xs text-[var(--muted)]">{configuredUsers} configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">Subscribers</p>
            <p className="mt-1 text-2xl font-bold font-mono">{activeSubscribers}</p>
            <p className="text-xs text-[var(--muted)]">
              {monthlyCount} mo · {yearlyCount} yr · {lifetimeSold} ltd
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">MRR</p>
            <p className="mt-1 text-2xl font-bold font-mono">{formatCurrency(mrr)}</p>
            <p className="text-xs text-[var(--muted)]">+ {formatCurrency(ltdRevenue)} LTD</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs font-semibold uppercase text-[var(--muted)]">LTD Seats</p>
            <p className="mt-1 text-2xl font-bold font-mono">
              {lifetimeSold}/{LIFETIME_DEAL_LIMIT}
            </p>
            <p className="text-xs text-[var(--muted)]">{LIFETIME_DEAL_LIMIT - lifetimeSold} remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* User table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--line)] text-left text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3">Quotes</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Quote Value</th>
                  <th className="px-4 py-3 hidden sm:table-cell">Joined</th>
                  <th className="px-4 py-3 hidden md:table-cell">Last Quote</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const email = emailMap.get(user.id) ?? "";
                  const stats = quoteStatsMap.get(user.id);
                  const quoteCount = stats?.count ?? 0;
                  const quoteValue = stats?.total_revenue ?? 0;

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--brand-muted)] transition"
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold truncate max-w-[200px]">
                          {user.business_name || "—"}
                        </p>
                        <p className="text-xs text-[var(--muted)] truncate max-w-[200px]">
                          {email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor(user.billing_status)}`}
                        >
                          {user.billing_status === "active"
                            ? user.billing_cycle ?? "active"
                            : user.billing_status}
                        </span>
                        {user.billing_status === "inactive" && (
                          <p className="text-xs text-[var(--muted)] mt-0.5">
                            {user.free_quotes_used}/{user.free_quotes_limit} free
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono">{quoteCount}</td>
                      <td className="px-4 py-3 font-mono hidden sm:table-cell">
                        {quoteValue > 0 ? formatCurrency(quoteValue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)] hidden sm:table-cell">
                        {formatDate(user.created_at)}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)] hidden md:table-cell">
                        {formatDateShort(stats?.latest_at ?? null)}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[var(--muted)]">
                      No users yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

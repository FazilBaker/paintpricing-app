import { redirect } from "next/navigation";

import { deleteUserAction, reactivateUserAction, suspendUserAction } from "@/app/admin-actions";
import { DeleteUserButton } from "./delete-user-button";
import { getViewer } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

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
  status: string;
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
      "id, business_name, business_email, phone, billing_status, billing_cycle, free_quotes_used, free_quotes_limit, rates_configured_at, lifetime_deal_claimed_at, created_at, status",
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

  const kpis = [
    { label: "MRR", value: formatCurrency(mrr), sub: `+ ${formatCurrency(ltdRevenue)} LTD`, accent: "var(--amber-500)" },
    { label: "Active users", value: String(totalUsers), sub: `${configuredUsers} configured`, accent: "var(--navy-700)" },
    { label: "Quotes sent", value: String(totalQuotes), sub: "all time", accent: "var(--navy-500)" },
    { label: "Paid plans", value: String(activeSubscribers), sub: `${monthlyCount} mo · ${yearlyCount} yr · ${lifetimeSold} ltd`, accent: "#94A3B8" },
  ];

  return (
    <main className="bg-[var(--background)] min-h-dvh pb-20">
      {/* Dark sub-header */}
      <div
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(180deg, var(--navy-900), var(--navy-800))", color: "white", padding: "22px 32px" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, transparent 0 10px, rgba(255,255,255,0.02) 10px 11px)" }}
        />
        <div className="relative flex items-center justify-between max-w-[1240px] mx-auto">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold"
                style={{ background: "var(--amber-500)", color: "#3B2300", letterSpacing: "0.1em" }}
              >
                SUPERADMIN
              </span>
              <span className="text-xs font-mono opacity-50">admin.paintpricing.com</span>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight">Operations</h1>
          </div>
          <div className="text-xs text-right opacity-50">
            {totalUsers} users · {totalQuotes} quotes
          </div>
        </div>
      </div>

      <div className="max-w-[1240px] mx-auto px-8 py-7">
        {/* KPI tiles */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 mb-5">
          {kpis.map((k) => (
            <div
              key={k.label}
              className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] p-5 relative overflow-hidden"
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px]"
                style={{ background: k.accent }}
              />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] mb-2">{k.label}</p>
              <p className="font-mono text-[30px] font-bold" style={{ letterSpacing: "-0.02em" }}>{k.value}</p>
              <p className="text-xs text-[var(--muted)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>

        {/* User table */}
        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--surface)] overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--line-2)]">
            <div>
              <p className="text-[14px] font-semibold">Recent signups</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">All users</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "var(--background)" }} className="text-left">
                  {["User", "Plan", "Quotes", "Quote Value", "Joined", "Last Quote", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const email = emailMap.get(user.id) ?? "";
                  const stats = quoteStatsMap.get(user.id);
                  const quoteCount = stats?.count ?? 0;
                  const quoteValue = stats?.total_revenue ?? 0;
                  const planStyle: Record<string, { bg: string; color: string }> = {
                    active_monthly: { bg: "var(--navy-50)", color: "var(--navy-700)" },
                    active_yearly: { bg: "var(--navy-700)", color: "white" },
                    active_lifetime: { bg: "var(--amber-500)", color: "#3B2300" },
                    inactive: { bg: "#F1F5F9", color: "#475569" },
                  };
                  const planKey = user.billing_status === "active"
                    ? `active_${user.billing_cycle ?? "monthly"}`
                    : "inactive";
                  const ps = planStyle[planKey] ?? planStyle.inactive;
                  const planLabel = user.billing_status === "active"
                    ? (user.billing_cycle ?? "active")
                    : `Free (${user.free_quotes_used}/${user.free_quotes_limit})`;

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-[var(--line-2)] hover:bg-[var(--background)] transition"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold truncate max-w-[160px]">{user.business_name || "—"}</p>
                          {user.status === "suspended" && (
                            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">Suspended</span>
                          )}
                          {user.status === "banned" && (
                            <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700">Banned</span>
                          )}
                        </div>
                        <p className="text-xs text-[var(--muted)] truncate max-w-[180px]">{email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block rounded px-2 py-0.5 text-[11px] font-semibold capitalize"
                          style={{ background: ps.bg, color: ps.color }}
                        >
                          {planLabel}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">{quoteCount}</td>
                      <td className="px-4 py-3 font-mono text-[var(--muted)]">
                        {quoteValue > 0 ? formatCurrency(quoteValue) : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted)] text-xs">{formatDate(user.created_at)}</td>
                      <td className="px-4 py-3 text-[var(--muted)] text-xs">{formatDateShort(stats?.latest_at ?? null)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {user.status === "active" ? (
                            <form action={suspendUserAction.bind(null, user.id)}>
                              <button
                                type="submit"
                                className="rounded px-2 py-1 text-[11px] font-semibold bg-amber-100 text-amber-800 hover:bg-amber-200 transition"
                              >
                                Suspend
                              </button>
                            </form>
                          ) : (
                            <form action={reactivateUserAction.bind(null, user.id)}>
                              <button
                                type="submit"
                                className="rounded px-2 py-1 text-[11px] font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition"
                              >
                                Reactivate
                              </button>
                            </form>
                          )}
                          <DeleteUserButton userId={user.id} label={email || user.business_name || "this user"} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-[var(--muted)]">No users yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

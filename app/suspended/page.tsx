import Link from "next/link";

export default function SuspendedPage() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-md rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow)]">
        <div
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ background: "var(--warning-soft)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--warning)" }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h1 className="text-xl font-bold mb-2">Account suspended</h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          Your account has been temporarily suspended. If you think this is a mistake, please reach out and we'll sort it out.
        </p>
        <a
          href="mailto:support@paintpricing.com"
          className="inline-block rounded-[var(--radius)] bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition"
        >
          Contact support
        </a>
        <div className="mt-4">
          <Link href="/login" className="text-xs text-[var(--muted)] hover:underline">
            Sign in with a different account
          </Link>
        </div>
      </div>
    </main>
  );
}

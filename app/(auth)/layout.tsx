import type { Metadata } from "next";

// Auth utility pages (login, signup, forgot/reset password) are thin by design and
// should not be indexed. noindex also dedupes the /signup?plan= query-param variants
// (clears the "duplicate pages without canonical" crawl issue) and keeps these routes
// out of search where they have no standalone SEO value.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}

const ADMIN_EMAILS = ["fazilbaker.fb@gmail.com"];

export function isAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

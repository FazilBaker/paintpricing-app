# Google sign-in setup (one-time)

The "Continue with Google" button on signup/login is fully coded. To activate it
you need to do two things in dashboards Claude can't reach: create a Google
OAuth client, and turn the provider on in Supabase. This whole walkthrough is
~10 minutes.

## Why this design is secure

The flow is **Supabase-brokered OAuth with PKCE**. What that means in plain
terms:

- **The browser never sees the Google client secret.** The secret lives only in
  Supabase's dashboard. Google's callback goes to Supabase, not directly to our
  app, so the secret never has to ship to the user.
- **PKCE binds the redirect to the original device.** Google returns a `code`
  to Supabase, which exchanges it for a session using a code verifier our
  browser generated. An attacker who intercepts the URL can't replay it
  because they don't have the verifier.
- **Session lives in httpOnly cookies.** The `@supabase/ssr` middleware we
  already have writes session cookies the browser JS can't read, so an XSS
  bug can't lift the session.
- **RLS still applies.** Row-Level Security on every table runs identically
  whether the user signed in with Google or email/password. The auth method
  is irrelevant to data access rules.
- **No extra Google scopes.** We request `email profile` only. We don't ask
  for Drive, Calendar, Contacts, or anything else, so even if the OAuth token
  leaked it grants almost nothing.
- **Account chooser is forced.** `prompt=select_account` makes Google show the
  picker every time, so painters with a personal + business Google account can
  pick the right one rather than being silently logged in as the wrong one.

## What you actually do

### 1. Create the Google OAuth client (~4 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and select
   or create a project (one project covers all environments).
2. **APIs & Services → OAuth consent screen**. If you have not configured one:
   - User type: **External**
   - App name: `PaintPricing`
   - User support email: your address
   - Authorized domains: `paintpricing.com`
   - Developer contact: your address
   - Scopes: leave at the defaults (email, profile, openid)
   - Test users: add your own email if the app is still in Testing mode
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `PaintPricing web`
   - **Authorized JavaScript origins** (one per line):
     ```
     https://app.paintpricing.com
     http://localhost:3000
     ```
   - **Authorized redirect URIs** — this is the critical one. It points to
     Supabase, NOT to our app:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
     Replace `<your-project-ref>` with the subdomain from your
     `NEXT_PUBLIC_SUPABASE_URL`. Example: if your URL is
     `https://abcdwxyz.supabase.co`, the redirect URI is
     `https://abcdwxyz.supabase.co/auth/v1/callback`.
4. Click Create. Copy the **Client ID** and **Client secret** that appear.

### 2. Enable Google in Supabase (~3 min)

1. Open the Supabase dashboard for the PaintPricing project.
2. **Authentication → Providers → Google**:
   - Enable the toggle
   - Paste the **Client ID** and **Client secret** from step 1
   - Save
3. **Authentication → URL Configuration → Redirect URLs**. Add (one per line):
   ```
   https://app.paintpricing.com/auth/callback
   http://localhost:3000/auth/callback
   ```
   These are the URLs Supabase is allowed to bounce the browser back to after
   it finishes the OAuth exchange. Without this, sign-in succeeds at Google,
   the user lands at Supabase, and then errors with "invalid redirect URL".
4. Confirm **Site URL** (just above Redirect URLs) is set to
   `https://app.paintpricing.com`.

### 3. Test the flow

1. Open `https://app.paintpricing.com/signup` (or localhost during dev).
2. Click **Sign up with Google**.
3. Google should show the account chooser, you pick an account, it bounces
   through `<project>.supabase.co/auth/v1/callback`, then to
   `https://app.paintpricing.com/auth/callback?code=...`, and finally to
   `/dashboard`.
4. Check the Supabase Auth → Users tab — the new account appears with
   provider `google`.

If you get an "invalid redirect URI" error from Google, the redirect URI in
step 1.3 does not match Supabase's callback URL — double-check the project ref.

If you get a Supabase redirect error after Google, the URL Configuration list
in step 2.3 is missing your callback URL.

## What this does NOT do

- It does not let users skip our terms or pricing — the signup page still
  shows the "3 free quote unlocks" framing, and after the OAuth round-trip
  they land at `/dashboard` like an email signup.
- It does not auto-share data with Google. Google sees only that the user
  signed into "PaintPricing"; we never call any Google APIs.
- It does not replace email/password. Both methods stay available and a single
  email can use either, because Supabase ties them to the same user record.

## Operational notes

- **Rotating the secret**: regenerate in Google Cloud, paste the new secret in
  Supabase, no app deploy needed.
- **Going to production verification**: while in Testing mode the OAuth screen
  warns users and only allowed test emails can sign in. Submit for
  verification when you are ready to accept the broader public. Verification
  takes Google a few days for the basic identity scopes.
- **Audit**: Supabase logs every OAuth sign-in attempt under Authentication →
  Logs. Worth glancing at after launch to confirm flows are clean.

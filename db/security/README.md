# Database security (Neon)

PickFlick moved from Supabase to Neon on 2026-11-10. The Supabase-specific
hardening that used to live here (revoking `anon` / `authenticated` grants and
checking them with the Supabase advisor) no longer applies, so those SQL files
were removed. They are still in git history.

Why it isn't needed on Neon:

- Supabase exposed every `public` table through its REST Data API to the
  `anon` and `authenticated` roles, so grants and RLS were the only barrier.
  Neon has no public data API unless you turn on the Neon Data API, and this
  project does not use it.
- The app reaches the database only from server code (Drizzle over
  `postgres.js`), connecting as the table owner `neondb_owner`. Owners bypass
  RLS, so the `.enableRLS()` calls in `db/schema` are harmless defence in depth.
  Keep using them on new tables.
- Auth data lives in the `neon_auth` schema, which Neon Auth manages. Don't edit
  it with Drizzle; `drizzle-kit` only manages the `public` schema here.

What still matters:

- Server actions and API routes must check `getAuthenticatedUser()` from
  `lib/auth/server.ts` before reading or writing a user's data.
- Keep `DATABASE_URL` and `NEON_AUTH_COOKIE_SECRET` server-only (never
  `NEXT_PUBLIC_`).
- If you ever enable the Neon Data API, revisit grants and add RLS policies
  first.

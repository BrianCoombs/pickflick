# Supabase table security

Applied on 2026-09-23 to production project `nmqumzzvttaezmvtyrzm` (`pickflick`).

The application accesses its eight data tables through server-side Drizzle using
the `postgres` database role. Supabase browser clients use Auth, not the Data API.
Each table therefore enables RLS without client policies and denies all table
privileges to `PUBLIC`, `anon`, and `authenticated`. Existing `postgres` and
`service_role` access is preserved. Server actions must still authorize requests.

`20260923_secure_public_tables.sql` applies this configuration atomically and
also removes automatic client grants on future tables created by `postgres` in
`public`. Other database creator roles have separate default privileges. Every
new application table should explicitly use `.enableRLS()` in its Drizzle schema.
Revisit grants and owner-specific policies before adding direct client queries.

This is a standalone, idempotent SQL remediation. It is deliberately outside the
old Drizzle migration journal: the live database has no Drizzle migration history,
and the repository's journal references an initial SQL migration that is missing.
Do not run the legacy migration chain to apply this fix.

## Apply and verify

Use an authenticated Supabase CLI, explicitly linked to the intended project.
The local `.env` and `.env.local` currently refer to older projects; do not use
them to select the production database.

```sh
security_workdir=$(mktemp -d)
supabase init --workdir "$security_workdir" --yes
supabase link --project-ref nmqumzzvttaezmvtyrzm --workdir "$security_workdir" --yes
supabase db query --linked --workdir "$security_workdir" \
  --file "$PWD/db/security/20260923_secure_public_tables.sql"
supabase db query --linked --workdir "$security_workdir" \
  --file "$PWD/db/security/verify_public_tables.sql"
supabase db advisors --linked --workdir "$security_workdir" \
  --type security --level warn --fail-on warn
```

Run from the repository root. The verification SQL checks all eight tables,
client table and column privileges, RLS activation under both API roles,
preserved backend privileges, and default grants. It exercises backend inserts
into all eight tables, reads session/swipe/match joins, updates and deletes, then
rolls back all test data.

## Verification on production

- No security warnings or errors from the CLI database advisor after the fix.
- The current upstream Supabase `sensitive_columns_exposed` linter query returned
  no findings (checked separately because the installed CLI uses an older linter).
- Anonymous REST reads of all eight tables returned HTTP 401 / SQLSTATE `42501`.
- Both `anon` and `authenticated` database roles were denied reads; neither has
  read, write, truncate, reference, trigger, or column privileges on these tables.
- Backend database smoke test passed and rolled back; before/after table counts
  matched. The token-bearing `user_movie_sources` table contained zero rows.
- An unauthenticated visit to the production `/sessions` page redirected to
  `/login`. A full signed-in browser workflow was not exercised.
- TypeScript and ESLint checks passed for the schema changes.

Supabase still reports eight informational `rls_enabled_no_policy` notices.
They are expected for these server-only tables: no client policy is intentional.
Do not add permissive policies just to remove those notices.

References: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
and [Supabase security linter](https://github.com/supabase/splinter/blob/main/splinter.sql).

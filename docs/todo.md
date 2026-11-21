# Watchlist pools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the host build a session's movie pool from participants' Trakt and Letterboxd watchlists.

**Architecture:** Pure parsing/pool logic in `lib/watchlists/` with unit tests; Trakt (PKCE) and Letterboxd (public HTML) fetchers on top; server actions and two API routes for linking; the existing criteria form gains a "Watchlists" mode. Watchlists are fetched live on every pool build; only Letterboxd slug→TMDb matches are cached.

**Tech Stack:** Next.js 16 (App Router, server actions), Drizzle + Neon Postgres, Neon Auth, shadcn/ui, Node's built-in test runner via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-21-watchlist-pool-design.md`

## Global Constraints

- Movies only. Pool size stays 50 (random sample of the union).
- Trakt: PKCE (S256), no client secret. Env `TRAKT_CLIENT_ID`. Authorize `https://auth.trakt.tv/oauth/authorize`; token/revoke `https://api.trakt.tv/oauth/token`, `/oauth/revoke`; headers `trakt-api-version: 2`, `trakt-api-key: <client id>`.
- Redirect URI: `${origin}/api/connect/trakt/callback`.
- Letterboxd behind `LETTERBOXD_ENABLED` (anything but `"false"` = on). Browser user agent on every request. About 5 film-page fetches at a time.
- Per-source time budget about 20s. One failed source never blocks the others.
- Required copy: "Your Letterboxd watchlist must be public (Settings → Privacy on letterboxd.com)." and "PickFlick uses Trakt but is not endorsed or certified by Trakt".
- `source_type` values: `trakt`, `letterboxd`. Watchlist preferences: `{ mode: "watchlists", sources: [{ userId, sourceType }] }`; no `mode` means genre/year filters.
- Every server action/route checks `getAuthenticatedUser()`; session actions check membership.

## Review Focus

1. Letterboxd user with a private or nonexistent watchlist → clear error when saving; skipped with a toast when building the pool.
2. Trakt access token expired → refreshed transparently; refresh revoked → source reported as failed, not a 500.
3. Every selected source fails or all lists are empty → nothing saved, the user sees an error, the old pool stays.
4. Same movie on several lists → appears once.
5. Letterboxd watchlist longer than one page (more than 28 films) → all pages read.

---

### Task 0: Letterboxd-from-Vercel check (throwaway)

- [x] Add `app/api/debug/letterboxd/route.ts` that fetches one public watchlist page and one film page and returns status codes and whether slugs/TMDb ID were found.
- [x] Push the branch, call the route on the Vercel preview, record the result here, delete the route.

### Task 1: Test runner and pure watchlist logic

**Files:** Create `lib/watchlists/letterboxd-parse.ts`, `lib/watchlists/pool.ts`, tests beside them, fixtures in `lib/watchlists/__fixtures__/`. Modify `package.json`.

**Produces:**
- `parseWatchlistSlugs(html: string): string[]`
- `isWatchlistPage(html: string): boolean`
- `parseFilmTmdbId(html: string): number | null`
- `buildWatchlistPool(lists: number[][], size: number, random?: () => number): number[]` (union, dedupe, shuffle, slice)

- [x] Add `tsx` dev dependency; scripts `test:unit` = `node --import tsx --test "lib/**/*.test.ts"`, `test` = `npm run test:unit`.
- [x] Tests: slugs parsed from a saved watchlist page fixture (count > 0, first slug matches); empty list page → `[]`; TMDb ID parsed from a film fixture (`parasite-2019` → `496243`); missing → `null`; pool dedupes `[[1,2],[2,3]]` → set `{1,2,3}`; size cap respected.
- [x] Implement; run `npm run test:unit` → pass. Commit.

### Task 2: Schema

**Files:** Modify `db/schema/movies-schema.ts`; generated migration in `db/migrations/`.

- [x] Unique `(user_id, source_type)` on `user_movie_sources`; new `letterboxd_films (slug varchar(255) pk, tmdb_id integer null, updated_at)` with `.enableRLS()`. Export types.
- [x] `npm run db:generate`, review SQL, `npm run db:migrate`. Commit.

### Task 3: Trakt client and source store

**Files:** Create `lib/watchlists/trakt.ts`, `lib/watchlists/pkce.ts` (+ test), `lib/watchlists/sources.ts`.

**Produces:**
- `createPkcePair(): { verifier: string; challenge: string }`, `challengeFor(verifier: string): string`
- `traktAuthorizeUrl(redirectUri, state, challenge): string`
- `exchangeTraktCode(code, verifier, redirectUri): Promise<TraktTokens>`, `refreshTraktToken(refreshToken, redirectUri)`, `revokeTraktToken(token)`
- `getTraktUsername(accessToken): Promise<string>`, `getTraktWatchlistTmdbIds(accessToken): Promise<number[]>`
- `getUserSources(userId): Promise<LinkedSource[]>`, `getSourcesForUsers(userIds)`, `upsertSource(...)`, `deleteSource(userId, type)`, `getValidTraktToken(userId, redirectUri): Promise<string>`
- `LinkedSource = { userId: string; sourceType: "trakt" | "letterboxd"; username: string }`

- [x] Test `challengeFor` against RFC 7636 vector (`dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk` → `E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM`). Fail → implement → pass.
- [x] Implement the rest. Commit.

### Task 4: Trakt connect routes

**Files:** Create `app/api/connect/trakt/route.ts`, `app/api/connect/trakt/callback/route.ts`.

- [x] Start: require user, set httpOnly `trakt_pkce` and `trakt_state` cookies (10 min), redirect to authorize URL.
- [x] Callback: verify state, exchange code, fetch username, upsert, clear cookies, redirect `/settings?linked=trakt`; on error redirect `/settings?error=<code>`. Commit.

### Task 5: Letterboxd fetcher

**Files:** Create `lib/watchlists/letterboxd.ts`.

**Produces:** `letterboxdEnabled(): boolean`, `checkLetterboxdUser(username): Promise<"ok" | "not_found" | "private_or_empty" | "blocked">`, `getLetterboxdWatchlistTmdbIds(username, deadline: number): Promise<number[]>`

- [x] Page through `/<user>/watchlist/page/<n>/` until no slugs; resolve slugs via `letterboxd_films` cache, fetch misses 5 at a time, store results (including null). Commit.

### Task 6: Settings page and actions

**Files:** Create `actions/db/watchlist-actions.ts`, `app/settings/page.tsx`, `app/settings/_components/watchlist-sources.tsx`. Modify `components/header.tsx`.

**Produces:** `getMyWatchlistSources()`, `saveLetterboxdUsername(username)`, `removeWatchlistSource(type)`, `getSessionWatchlistOptions(sessionId): ActionState<WatchlistOption[]>` where `WatchlistOption = { userId; name; sources: LinkedSource[] }` (names from `neon_auth."user"`, email prefix fallback).

- [x] Settings card: Trakt connect/disconnect, Letterboxd username save/remove with the public-watchlist note, error/success banners from query params, Trakt notice. Header dropdown gets "Profile". Commit.

### Task 7: Pool building

**Files:** Create `lib/watchlists/build.ts`. Modify `actions/db/movies-actions.ts`.

**Produces:** `buildPoolFromWatchlists(sources: {userId; sourceType}[], redirectUri): Promise<{ movieIds: number[]; failed: { userId; sourceType; name? }[] }>`

- [x] Fetch all selected sources in parallel with a 20s deadline each, union via `buildWatchlistPool(…, 50)`.
- [x] `updateSessionPreferences` branches on `mode === "watchlists"`: error (nothing saved) if pool empty; returns `failed` in `data`. Commit.

### Task 8: Lobby and form UI

**Files:** Modify `components/movie-preferences-form.tsx`, `app/sessions/[sessionId]/_components/criteria-dialog.tsx`, `swipe-interface.tsx`, `app/sessions/new/page.tsx`.

- [x] Form: optional `watchlistOptions` prop; when given, a "Genres & years | Watchlists" toggle; watchlist mode lists people with a checkbox per source (pre-ticked), greyed "No watchlist linked".
- [x] Dialog loads options on open; toasts failed sources by name. Optional `trigger` label.
- [x] Waiting screen: host-only "Choose movies" dialog next to Start Session.
- [x] New-session page hint. Commit.

### Task 9: Privacy page, Trakt notice, docs

- [x] `app/(marketing)/privacy/page.tsx` (what we store, Trakt tokens, deletion on disconnect) with the Trakt notice; README section; CLAUDE.md env list. Commit.

### Task 10: Verify and ship

- [x] `npm run type-check`, `npm run lint`, `npm run test:unit`, `npm run build`.
- [x] Manual run in the browser: settings, Letterboxd link, lobby picker, pool build.
- [ ] Push branch. Ask Brian before merging to production.
- [ ] After merge: submit Trakt Production access request.

## Review

- Built as planned: Trakt (PKCE) and Letterboxd linking on `/settings`, a host-only
  "Choose Movies" dialog on the lobby waiting screen, watchlist mode in Change Criteria,
  live fetching with one failed list never blocking the rest, `/privacy` with the Trakt notice.
- Letterboxd works from Vercel (checked on a preview deployment, Task 0), so it ships enabled.
  `LETTERBOXD_ENABLED=false` hides it if that changes.
- Fixed two existing bugs found while testing: toasts never showed anywhere in the app
  (Toaster listened to a second copy of the toast store), and the participant-name query.
- Final review: no security or authorization issues. Fixed three Letterboxd issues it found
  (TV ids, progress lost on a 429 or stalled request, transient errors cached forever).
- Checks: type-check, lint, 26 unit tests, production build, and a manual run in Chrome
  (profile page, three Letterboxd username cases, lobby pool build, failure toast).
- Not verified end-to-end: Trakt sign-in. Trakt asked for profile setup (birthday) on the
  owner account before it would authorize.


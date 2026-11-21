# Watchlist-based movie pools: design

Date: 2026-11-21. Branch: `feat/watchlist-pool` (off `main`).

## Intent

Today the host builds a session's movie pool from genres, a year range and a
minimum rating. Friends already keep lists of movies they want to see. This
feature lets the host build the pool from the watchlists of the people in the
lobby instead, so the group swipes on movies someone actually wants to watch.

Each person links their watchlist once, on a new profile page. Once everyone is
in the lobby (the waiting screen before the host presses Start), the host picks
whose lists to include.

## Goals

- A profile page where a user links Trakt (OAuth) and/or a Letterboxd username,
  and can unlink either.
- In the criteria form, a second mode: "Watchlists" instead of "Genres & years".
  It lists the session's participants and their linked sources; you tick the
  ones to include.
- The pool contains every movie on any selected list (union, not overlap).
- Watchlists are fetched live from Trakt/Letterboxd every time a pool is built
  (session creation or criteria change). Nothing about a user's watchlist is
  stored.

## Non-goals

- Google TV: there is no public watchlist API. Not supported.
- Letterboxd's official API: request-only and effectively closed. Not used.
- TMDb, IMDb, Plex watchlists. TMDb is a possible later addition.
- TV shows. Movies only.
- Mixing watchlists with genre/year filters. Watchlist mode replaces them.
- Syncing or storing watchlist contents (the user chose live fetches over a
  stored, periodically refreshed copy).

## Anti-goals

- A lobby that hangs or errors out because one person's list failed to load.
  One bad source must not block the others.
- Asking anyone to paste a password or API key.

## Constraints and facts found

- Pool is a list of TMDb IDs stored in `movie_sessions.movie_pool`; the session
  page fetches each from TMDb on every load (`app/sessions/[sessionId]/page.tsx`).
- Pool is built in `MovieService.getMoviePool` (`lib/api/movie-service.ts`),
  called from `createMovieSession` and `updateSessionPreferences`
  (`actions/db/movies-actions.ts`). Both store `preferences` as JSON.
- The form is `components/movie-preferences-form.tsx`, used by
  `app/sessions/new/page.tsx` (before anyone joins) and `CriteriaDialog`.
  `CriteriaDialog` is **not** on the waiting screen today (the `!sessionStarted`
  branch of `swipe-interface.tsx`); it only appears after Start, in the swiping
  status bar and on the "no more movies" screen. Using it there runs
  `updateSessionPreferences`, which deletes every swipe in the session.
- `updateSessionPreferences` lets any participant change criteria.
- `user_movie_sources` already exists (`db/schema/movies-schema.ts`) with
  `user_id`, `source_type`, `access_token`, `refresh_token`, `metadata`. It is
  unused. It is server-only (RLS on, no client grants; see `db/security/`).
- No profile/settings page exists. `/settings` is already protected in `proxy.ts`.
- Participant display names live in Neon Auth's `neon_auth` schema, which we read
  but never write.
- Trakt: OAuth 2 authorization-code flow. `GET /sync/watchlist/movies` returns
  items with `ids.tmdb`. Free accounts cap watchlists at 250 items and reportedly
  allow one connected third-party app. Access tokens expire and must be
  refreshed with the refresh token. Rate limit: 1,000 GETs per 5 minutes per user.
- Letterboxd: `https://letterboxd.com/<user>/watchlist/page/<n>/` returns HTML
  with about 28 films per page, each as `data-item-slug="<slug>"`. Each film page
  `https://letterboxd.com/film/<slug>/` contains `data-tmdb-id="<id>"`. Verified
  from a home connection on 2026-11-21 with a browser user agent: 200, no bot
  challenge. Untested from Vercel; it may be challenged there.

## Approaches considered

1. **Store each watchlist, refresh when stale.** Fast pool builds, fewer
   Letterboxd requests. Lists can be a few hours behind.
2. **Fetch live on every pool build.** Always current, nothing stored. Slower
   builds for large Letterboxd lists, and more requests that could get blocked.

**Chosen: 2 (live fetch), by Brian.**

## Design

### Profile page (`/settings`)

- New page at `app/settings/page.tsx`, linked from the user menu
  (`components/sidebar/nav-user.tsx` and/or `components/header.tsx`).
- A "Watchlists" card with one row per source:
  - **Trakt:** "Connect Trakt" button → OAuth. Once linked: Trakt username,
    "Disconnect".
  - **Letterboxd:** username field + "Save". On save, the server fetches page 1
    of the watchlist; if it is 404, empty-because-private, or not a watchlist
    page, show an error. Helper text: "Your Letterboxd watchlist must be public
    (Settings → Privacy on letterboxd.com)." Once linked: username, "Remove".
- One row per user per source in `user_movie_sources`; add a unique constraint on
  `(user_id, source_type)` via a Drizzle migration. `source_type` is `trakt` or
  `letterboxd`.

### Trakt OAuth

- Registered 2026-11-21 at developer.trakt.tv: app "PickFlick" (ID 275873),
  owner @2bcoombs2_153bc3, Development type. Redirect URIs:
  `https://pickflick.vercel.app/api/connect/trakt/callback` and
  `http://localhost:3000/api/connect/trakt/callback`.
- **PKCE, no client secret.** Trakt's new developer portal issues only a Client
  ID and requires PKCE. Env: `TRAKT_CLIENT_ID` only (set in `.env.local` and in
  Vercel for all environments). Read the PKCE guide on developer.trakt.tv for
  the exact authorize/token parameters.
- **Who can sign in:** a Development app allows the owner plus up to 16 Trakt
  users added under the app's Members tab (as Testers). Friends must be added
  there by Trakt username before they can link. Production access (anyone) can
  be requested later from the app page and yields a separate Client ID. The
  settings page should show a clear error when Trakt refuses a user who isn't a
  member.
- `GET /api/connect/trakt` → generates a PKCE verifier and `state`, stores both
  in short-lived httpOnly cookies, redirects to Trakt's authorize URL with the
  code challenge.
- `GET /api/connect/trakt/callback` → checks `state`, exchanges the code with
  the verifier, calls
  `GET /users/me` for the username, upserts the row (tokens + `expires_at` and
  username in `metadata`), redirects to `/settings`.
- A helper gets a valid access token, refreshing and saving it first when
  expired. If refresh fails (revoked), treat the source as broken (see errors).
- Disconnect deletes the row and calls Trakt's revoke endpoint (best effort).

### Criteria form

- The form gets a mode switch at the top: "Genres & years" | "Watchlists".
  Existing behaviour is unchanged in the first mode.
- Watchlists mode needs the session's participants and their linked sources.
  The dialog loads them from a new server action
  `getSessionWatchlistOptions(sessionId)` returning, per participant: user id,
  display name, and linked sources (`trakt` / `letterboxd`, with username).
  Caller must be a participant.
- Each participant is shown with a checkbox per linked source
  ("Sam · Letterboxd"). Participants with nothing linked are shown greyed out
  with "No watchlist linked". All available sources are pre-ticked.
- **Where picking happens (Claude's call, from Brian's "once you've got
  everybody in the lobby"):** add a "Choose movies" button for the host on the
  waiting screen, next to Start Session. It opens the same dialog. Saving
  rebuilds the pool right away (so failed sources show up before anyone swipes);
  no swipes exist yet, so nothing is lost. Host only on the waiting screen,
  because the host controls Start. After Start, Change Criteria works as today,
  including the watchlist mode.
- The new-session page keeps only "Genres & years" (no one else has joined, so
  watchlist mode there would only offer the host's list). It shows a hint:
  "Want to use watchlists? Pick them in the lobby once friends join." The
  session gets a default pool as today, replaced when the host picks lists.
- Submitting stores `preferences = { mode: "watchlists", sources: [{ userId,
  sourceType }] }`. Existing genre/year preferences omit `mode` (treated as
  `"filters"`), so old sessions keep working.

### Building the pool

- `getMoviePool` branches on `filters.mode === "watchlists"`.
- For each selected source, in parallel, fetch the watchlist as TMDb IDs:
  - Trakt: `GET /sync/watchlist/movies` with the user's token.
  - Letterboxd: walk watchlist pages until a page has no films, collect slugs,
    then resolve each slug's TMDb ID from its film page, with limited
    concurrency (about 5 at a time) and the browser user agent.
- Union the IDs, de-duplicate, shuffle, and take up to the pool size. Pool size
  stays 50: lists can hold hundreds of movies, and the session page loads every
  pool movie from TMDb on each visit.
- No rating or year filter in this mode. Movies TMDb can't find are dropped.
- **Errors:** if a source fails (private list, Letterboxd blocked us, Trakt
  token revoked, timeout), skip it and keep the rest. `getMoviePool` returns the
  movies plus a list of failed sources; the action passes those back so the
  dialog shows a toast like "Couldn't load Sam's Letterboxd watchlist". If every
  source fails or the union is empty, nothing is saved and the user sees an
  error instead of an empty session.
- Timeouts: each source fetch gets a time budget (about 20s) so the request
  stays within Vercel's function limit.

### Letterboxd ID cache (builder's call to keep or drop)

Live fetching means a 200-film Letterboxd list costs about 200 film-page
requests per pool build. A slug never changes its TMDb ID, so a small
`letterboxd_films (slug primary key, tmdb_id)` table would make repeat builds
take a handful of requests. This stores no user data, so it doesn't conflict
with the live-fetch choice, but it is Claude's suggestion, not Brian's decision.
Recommended.

## Order of work (Claude's call)

Letterboxd may be blocked from Vercel, which would break both linking (the
settings page checks page 1) and pool building. So the first task is a
throwaway check: a tiny route on a Vercel preview deployment that fetches one
public watchlist page and one film page and reports the status codes. Trakt
work doesn't depend on it and can proceed in parallel.

**If Vercel is blocked (Brian's decision):** ship Trakt, and keep the
Letterboxd code built but hidden behind a switch (env var such as
`LETTERBOXD_ENABLED`) so no one sees a broken option. A workaround, such as a
relay hosted elsewhere, is a separate decision later.

## Left to the builder

- Exact component structure and file names beyond those named above.
- How display names are read from `neon_auth` (or fall back to email prefix).
- Exact OAuth `state` handling and cookie names.
- HTML parsing approach for Letterboxd (regex vs a parser), as long as failures
  surface as a failed source rather than a crash.
- Tests: unit tests for the Letterboxd parser (against saved HTML fixtures), the
  union/shuffle logic, and preference-mode handling; manual end-to-end check of
  the Trakt flow.

# Swipe upgrades: TV shows, filters, match modes, resume

The previous plan (stop swiping once the session has a match) is in git history.

Detailed plans, one per area, in `docs/superpowers/plans/`:
`2026-11-25-tv-shows.md`, `2026-11-25-pool-filters.md`, `2026-11-25-session-settings.md`, `2026-11-25-swipe-card.md`.

Pure logic gets a failing unit test first (`npm run test:unit`).
Work happens on branch `feat/swipe-upgrades`. Nothing merges to `main` or touches the production database without Brian's go-ahead.

## Decisions

- **Session settings live in columns, not in the preferences JSON** (one migration, `0002`):
  - `media_type` is `movie` or `tv`.
  - `match_mode` is `first` or `all`.
  - `pool_version` is a number that goes up each time the pool changes.
  - `reset_version` is a number that goes up only when the host resets mid-session.
  - `match_history` gets a unique key on session + movie.
  - Every column has a default, so existing sessions keep working unchanged.
- **One title type for movies and shows.** Everything on screen reads a single `Title` type that covers both. The card's length line shows "1h 52m" for movies and "5 seasons · 62 episodes" for TV.
- **Genres are any-of.** The pool takes movies from any chosen genre, mixed evenly across them, and is never padded with movies outside the filters.
- **Rating:** Any, 6+ (the default), 7+ or 8+. A minimum vote count is applied behind the scenes.
- **Where to watch:** US subscription streaming only:
  - Netflix, Prime Video, Disney+, HBO Max, Hulu, Apple TV, Peacock, Paramount+.
  - Hidden in watchlist mode.
- **When does it end?** The host chooses at creation:
  - "First tape everyone rents" (the default, today's behaviour).
  - "Swipe them all, then see every match". The results page lists every movie everyone liked once everyone has finished the pool. In this mode the host can also end early.
- **Add 50 more:**
  - Appears when everyone has finished the pool and nobody agreed on anything, in either mode.
  - Any member can press it.
  - Only one press counts.
  - The pool can grow to 500 at most.
- **Read-only "Rental terms" panel.** Lists the session's settings, shown to everyone in the lobby and from the swipe screen.
- **Session settings button (host).**
  - Replaces "Choose movies" / "Change movies" in the lobby and on the swipe screen.
  - One dialog changes everything: Movies or TV, the match mode, and the filters or watchlists.
  - The new-session page uses the same form.
  - Media type and match mode can change after creation.
  - In the lobby, saving just rebuilds the pool.
  - Mid-session, saving first asks the host to confirm: "This resets everyone's swipes." It then rebuilds the pool, deletes all swipes, and bumps `pool_version` and `reset_version`.
  - Everyone else gets a notice when `reset_version` goes up: "The host changed the settings and reset the session. Start swiping again." The host doesn't see it.
  - Non-hosts see the read-only Rental terms instead of the button.
- **How it works.**
  - **Lobby:** a "How it works" panel where everyone waits before the start. It covers swiping right to rent and left to pass, and how the session ends in its mode. In all mode that means swiping every title, then seeing the list.
  - **Swipe screen:** no strip. A "?" icon in the status bar opens the same explanation in a sheet.
  - **All mode:** an "Agreed so far: N" chip in the status bar opens a sheet listing those titles (poster, title, year).
  - The poll sends the agreed ids while swiping in all mode. This reverses the earlier "keep matches secret until the end" choice, at Brian's request.
- **Progress comes from saved swipes.** Refreshing or rejoining puts you on your first unswiped card, and this still works after the pool grows.

## Fixes found while planning

- Rejoining a started session by its code is refused today.
- Any member can change the criteria, which deletes everyone's swipes. Only the host will be able to.
- A swipe isn't checked against the session's pool.
- Years show one too low in US time zones (`new Date("2000-01-01")`).
- Genres overlap on phones: wrapped labels use `leading-none`, and one-word labels overflow fixed columns. Chips replace them.
- Multiple genres are joined with `,`, which TMDb treats as "has all of them", instead of `|`, "any of them".
- A short pool gets topped up with popular movies that ignore the filters.

## Steps

### Phase 1: foundation (blocks everything else)
- [x] 1. `lib/titles/*`: Title type, normalizers, `yearOf`, `titleLengthLabel`, `formatSeasonsEpisodes`, TV genres, copy, with tests
- [x] 2. Schema columns and the `0002` migration file (generated, not applied)
- [x] 3. `lib/sessions/preferences.ts` (`normalizePreferences`, `describePreferences`), provider constants, `buildDiscoverParams`, `buildBalancedPool`, with tests
- [x] 4. `lib/sessions/progress.ts` (`nextCard`, `memberProgress`, `everyoneDone`, `agreedTitles`, `nextStep`, `canAddMore`, `appendBatch`) and `joinDecision`, with tests

### Phase 2: server
- [x] 5. `tmdb.getTitle` / `discover`, `getEnrichedTitle`, `getTitlePool({ mediaType, prefs, size, exclude })`, watchlist pools with `mediaType` and `exclude`, Trakt shows
- [x] 6. Actions:
  - `createMovieSession` takes the media type and match mode.
  - `updateSessionPreferences` becomes `updateSessionSettings({ mediaType, matchMode, preferences })`. It is host-only, works while the session is active or started, and bumps `reset_version` when started.
  - `swipeMovie` checks the pool and handles all mode.
  - New `settleSession`, `addMoreMovies` and `endSessionNow`.
  - `joinMovieSession` lets members rejoin.
- [x] 7. The participants poll returns `poolVersion`, `resetVersion` and progress. The hook refreshes when either changes and flags a reset for non-hosts.

### Phase 3: screens (parallel, separate files)
- [x] 8. Swipe card: `Title`, length line, "Back of the box" sheet for the full description, resume from saved swipes, remount on pool change
- [x] 9. Shared session settings form, used on the new-session page and in the host's Session settings dialog:
  - Movies / TV toggle and the "When do we stop?" choice.
  - A reset confirmation when saving mid-session.
  - Genre, provider and rating chips.
  - "Only N match" message.
- [x] 10. "How it works" in the lobby and behind a "?" on the swipe screen, the agreed-so-far chip and sheet, reset notice for participants, waiting counter (replaces "Out of movies"), Add 50 more, host's End now, all-matches results page, Rental terms panel and settings sheet

### Phase 4: check
- [x] 11. Unit tests, `tsc`, lint, and a code review of the whole branch
- [x] 12. Run locally at phone size against a dev database branch (not production):
  - first mode is unchanged
  - all mode ends with a list of matches
  - zero matches, then add more
  - refresh and rejoin resume
  - a whole TV session

### Ship (needs Brian)
- [ ] 13. Apply the `0002` migration to production, then merge and deploy

## Review

Built by subagents in four phases. Each phase was planned first; the files are in `docs/superpowers/plans/`, and `2026-11-25-phase3-contracts.md` holds the screen contracts.

### What changed
- **Foundation (`lib/`):**
  - `lib/titles` gives one `Title` shape for movies and TV, with the "1h 52m" and "N seasons · N episodes" labels, TV genres and copy for each media type.
  - `lib/sessions/preferences` reads filter preferences, including the shapes saved by old sessions.
  - `lib/api` builds genre-balanced pools with TMDb discover.
  - `lib/sessions/progress` and `settle` decide the next card, who's done, what's agreed, whether "add more" is allowed and how a session completes.
- **Migration `0002`:** adds `media_type`, `match_mode`, `pool_version`, `reset_version`, and a unique match per session. It only adds things. It is not applied to production yet.
- **Server:**
  - **Settings:** `updateSessionSettings` (host only) replaces the old criteria action. Mid-session it rebuilds the pool, clears swipes and bumps both versions.
  - **Swiping:** swipes lock the session row and are refused after a reset. First-match and all-matches completion both go through one versioned `completeSession`.
  - **New actions:** `addMoreMovies`, `endSessionNow`, and rejoining.
  - **Poll:** reports progress, agreed-so-far and the versions.
- **Screens:**
  - **Swipe card:** resumes from saved swipes, shows the length line, the "Back of the box" sheet and BOX SET for TV.
  - **Status bar:** agreed so far, the "?" button, and Session settings for the host or Rental terms for everyone else.
  - **Other screens:** the waiting counter with Add 50 more / End now, the reset notice, the all-matches results, a lobby with How it works and Rental terms, one settings form for new sessions and the host's dialog, and started sessions listed on /sessions.

### Concepts used
- **Optimistic concurrency.** Every change to the pool bumps `pool_version`. Completing a session, adding more, or resetting only succeeds if the version it read is still current (`UPDATE … WHERE pool_version = v`). If two people press Add 50 more, exactly one wins.
- **Row lock.** A swipe takes a shared lock on the session row (`FOR SHARE`). The host's reset takes a conflicting lock, so a swipe can't land in the middle of a reset.
- **Keyed remount.** In React, changing a component's `key` throws away its state. The deck is keyed so that a new pool gives everyone a fresh deck.
- **Derived progress.** There's no stored "current card"; it's worked out from the saved swipes. That makes refresh and rejoin work for free.

### Checked
- 269 unit tests pass, `tsc` and eslint are clean, and `next build` passes.
- Two independent reviewers (server and screens) went over the branch. Their findings were fixed in `ca6f75e`, including:
  - a title that failed to load could strand a session
  - reset races
  - `createMovieSession` accepted other users' ids
  - a redirect loop
  - dead code
- **Local run** at phone size (390px) in Chrome, signed in as Brian, against a local Postgres with all migrations applied. A second member was simulated in SQL.
  - All-matches mode: agreed-so-far went 0→2→3, resume after refresh landed on card 5, and the last swipe went to the results page (3 agreed, sorted by rating).
  - TV first-match mode: the BOX SET card, the waiting counter, then Add 50 more → 51/100.
  - The non-host sees only ? and Rental terms. The reset notice appears for the non-host.
  - Host Session settings mid-session: the confirm appears, then the session switches to Movies/all with a new pool and swipes cleared.
  - Fixed during the run: the card's length line was cut off at phone width, so "Back of the box" moved onto the title row.
- **Production (read-only):** `match_history` has no duplicate rows, so the unique constraint in `0002` will apply.

### Not done or not verified
- No real two-phone session yet: the second member was simulated in the database.
- The Trakt shows watchlist shape comes from Trakt's docs and hasn't been checked against a real account.
- The new-session page still offers watchlists only once friends join (the same as before).
- A title that fails to load shows as a placeholder card ("Tape #id").

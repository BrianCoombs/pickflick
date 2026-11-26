# Session settings: match modes, add more titles, read-only settings (2026-11-25)

Follows the shared decisions in scratchpad/plans/decisions.md. Where this plan
and that file disagree, the decisions file wins.

## Goal
1. A match mode chosen when the session is created:
   - "first" (default): the first title everyone likes ends the session. This mode stays exactly as it works today.
   - "all": keep swiping until everyone has swiped every title, then show every title everyone agreed on.
2. "Add 50 more" when everyone has finished the pool and nobody agreed on anything. Works in both modes.
3. A read-only summary of the session's settings for everyone. Non-hosts see it in the lobby and from the swipe screen.

## Decisions
- `match_mode` is a column, not a preferences key. `preferences.mode` already means "watchlists", and
  `updateSessionPreferences` replaces the whole preferences object. The mode is fixed at creation.
- `media_type` is a column too (decision 1). It is owned by the TV plan and read here by add-more and the summary.
- `pool_version` goes up whenever `movie_pool` changes: add more, or the host replaces the pool. It drives
  client refreshes (decision 8), the Swiper remount key (decision 6), and the guard that lets only one write win.
- Statuses don't change: active (lobby) -> started (swiping) -> completed.
  - First mode: unchanged. `matched_movie_id` is set and one match_history row is written.
  - All mode: completed with `matched_movie_id` NULL and one match_history row per agreed title.
- "Done" means every member in userIds has a swipe on every id in the current movie_pool. Only swipes on pool ids
  by members count. Ids are compared as strings: the pool stores numbers, swipes.movie_id stores strings.
- Add more is a button, not a creation setting. Any member can press it. The server only allows it when status
  is started, everyone is done, nothing was agreed, and the pool is under the cap of 500 (10 batches). If
  getTitlePool returns no new ids, or `exhausted` with 0 ids, the screen says "No more tapes match these filters."
- Host "End now" (all mode only) completes the session with whatever has been agreed so far, which can be
  nothing. It covers someone who wanders off and blocks "done" forever.
- Existing problems this plan fixes (decision 7):
  - `updateSessionPreferences` becomes host only, status active|started, with a conditional pool_version bump.
    Today any member can replace the pool and wipe everyone's swipes, at any status.
  - `swipeMovie` rejects movie ids that aren't in the pool.

## Schema and migration (the single shared 0002)
In db/schema/movies-schema.ts:
- movieSessions:
  - `mediaType: varchar("media_type", { length: 10 }).default("movie").notNull()`
  - `matchMode: varchar("match_mode", { length: 20 }).default("first").notNull()`
  - `poolVersion: integer("pool_version").default(1).notNull()`
- matchHistory: add a table callback with `uniqueSessionMovie: unique().on(t.sessionId, t.movieId)`.
  A read-only check of production found no duplicate rows.

Generate the migration with `npm run db:generate` and review the SQL. Adding columns with constant defaults is
metadata-only in Postgres. Brian applies it to production before deploying; old code ignores the new columns.

## Pure logic: lib/sessions/progress.ts (+ progress.test.ts)
This file also holds the swipe-card plan's `nextCard`. Session-settings functions:
- `parseMatchMode(v: unknown): "first" | "all"`. Anything unknown gives "first".
- `memberProgress(userIds, poolIds, swipes) -> { userId, swiped, remaining }[]`
- `everyoneDone(userIds, poolIds, swipes) -> boolean`
- `agreedTitles(userIds, poolIds, swipes) -> string[]`, in pool order. Reuses `everyoneLiked` from rules.ts,
  so old "super" swipes count as likes.
- `nextStep(mode, done, agreedCount) -> "keep-swiping" | "finish" | "offer-more"`
- `canAddMore({ status, done, agreedCount, poolLength, cap = 500 }) -> boolean`
- `appendBatch(pool, batch, cap = 500) -> { pool, added }`. Removes duplicates, keeps the existing order,
  and cuts the result at the cap.

Test cases:
- memberProgress / everyoneDone:
  - swipes on ids outside the pool don't count
  - swipes by non-members don't count
  - number pool ids match string swipe ids
  - an empty pool is never done; no members is never done
  - a member with 49 of 50 swiped is not done
  - left swipes count toward done
- agreedTitles:
  - left swipes don't count as agreement
  - "super" counts as a like
  - results keep pool order
  - a title liked by only some members is left out
- nextStep:
  - first mode, done, 0 agreed -> offer-more
  - all mode, done, 0 agreed -> offer-more
  - all mode, done, 2 agreed -> finish
  - not done (either mode) -> keep-swiping
- canAddMore is false when:
  - the status is completed or active
  - someone isn't done
  - anything was agreed
  - the pool is at the cap
- appendBatch:
  - drops repeats against the pool and inside the batch
  - an empty batch gives added 0
  - the result is cut at the cap

## Pure logic: lib/sessions/settings.ts (+ settings.test.ts)
`describeSessionSettings({ matchMode, mediaType, preferences, poolLength }, people) -> { label, value }[]`

Rows, in order:
- Ending: "First tape everyone rents" / "Swipe them all, see every match"
- Showing: Movies / TV shows
- Filter rows: from `describePreferences(normalizePreferences(raw, mediaType))` in lib/sessions/preferences.ts
  (genres, years, rating, providers)
- Watchlists, for watchlist preferences: "Sam's Letterboxd, Alex's Trakt". The name is "Someone" for people
  who have left.
- Pool: "100 tapes"

Tests:
- watchlist preferences vs filter preferences
- empty preferences show "Any"
- unknown match mode reads as first mode
- names of people who left

## Server: actions/db/movies-actions.ts
### createMovieSession
Signature: `createMovieSession(userIds, preferences, options: { matchMode?, mediaType? })`. Validate the mode with
`parseMatchMode` and store it in its column.

### settleSession(sessionId), internal and shared
1. Select the session and its swipes for that session.
2. Work out memberProgress, done, agreed and nextStep.
3. In all mode, when nextStep is "finish":
   ```ts
   await db.transaction(async tx => {
     const won = await tx.update(movieSessions)
       .set({ status: "completed" })
       .where(and(eq(movieSessions.id, id),
                  eq(movieSessions.status, "started"),
                  eq(movieSessions.poolVersion, v)))
       .returning({ id: movieSessions.id })
     if (won.length) await tx.insert(matchHistory)
       .values(agreed.map(movieId => ({ sessionId: id, movieId })))
       .onConflictDoNothing()
   })
   ```
4. Return `{ status, poolVersion, poolSize, progress, done, agreedCount }`. The agreed count stays on the
   server and is never sent to clients before the end.

### swipeMovie
- Reject ids that aren't in movie_pool.
- First mode: `checkForMatch` stays exactly as it is.
- All mode: no early match. After the insert, call settleSession and return `{ matched: status === "completed", done }`.
- Both modes return `done`.
- The early return for an already-completed session covers all mode too, sending the person to results.

### addMoreMovies(sessionId)
1. Check membership, read the session (pool_version v), run settleSession, and check canAddMore.
2. Get the next batch:
   - Filter pools: `getTitlePool({ mediaType, prefs, size: 50, exclude: pool })`
   - Watchlist pools: `buildPoolFromWatchlists(sources, traktRedirectUri(origin), { mediaType, exclude: pool })`
3. `appendBatch`. If it added 0, return `{ added: 0, reason: "exhausted" }`.
4. Update `movie_pool` and set `pool_version = v + 1` where `status = 'started' AND pool_version = v`.
5. No row updated: return `{ added: 0, reason: "already-added" }` and the client refreshes.
6. Success: `revalidatePath` and return `{ added, poolVersion }`.

### endSessionNow(sessionId)
Host only, all mode only, status started. Runs the same transaction as settleSession without the "done" check.

### updateSessionPreferences
- Host only, status active|started.
- Conditional update on pool_version, bumping it by one.
- Then delete swipes, as today.

## Races
- **Two final swipes land together (all mode).** Each insert commits before that request reads the swipes, so
  whichever read comes last sees both swipes. One of them always notices "done". If both notice, the
  conditional update lets exactly one win, and only the winner writes match_history (one transaction, plus the
  unique index with onConflictDoNothing).
- **The finishing request fails after its swipe saved.** The participants poll calls settleSession, so the
  session still completes within about 3 seconds.
- **Two people press Add more at once.** Both build a batch, but only the update with the matching pool_version
  wins. The loser gets "already-added" and refreshes. The button also locks on the client while busy.
  The result is 50 added, never 100.
- **The host replaces the pool while someone presses Add more.** Both writes are guarded by pool_version, so one
  fails cleanly. Completion is also guarded by pool_version.
- **A swipe on an id outside the pool** is rejected, so progress counts stay correct.

## Polling
app/api/sessions/[sessionId]/participants/route.ts:
- While started, also return `matchMode`, `poolVersion`, `poolSize`, `progress` (userId plus remaining) and
  `done`, by calling settleSession. The query is small: at most a few hundred swipe rows.

hooks/use-session-participants.tsx:
- Expose `progress`, `done` and `poolVersion`.
- Call `router.refresh()` when poolVersion changes.
- Redirect on completed, as today.

## UI (phone first, video-store look)
### Creation (app/sessions/new/page.tsx, or the preferences form footer)
- A paper panel "When do we stop?" with a shadcn RadioGroup offering the two modes. First mode is the default.
- It sits next to the TV plan's Movies/TV choice.
- Values are passed in createMovieSession's `options`.

### Waiting counter (new _components/waiting-counter.tsx)
Replaces the "Out of movies" branch in swipe-interface.tsx (decision 6).
- Heading "Waiting at the counter". A paper list of members, one dotted row each: name, then "done" or "12 left".
  Names come from `people`; page.tsx loads them while started as well.
- When nextStep is offer-more:
  - "Nobody rented the same tape"
  - a yellow **Add 50 more** button, min-h-11, pinned to the bottom with safe-area padding
  - a "Start a new session" link
  - toasts for "exhausted" and "already-added"
- All mode, host only: "End now and see matches" behind an AlertDialog.
- An empty pool from the start keeps today's "No titles matched" copy.

### Swipe screen status bar
- Non-hosts get an Info icon button (44px, aria-label "Session settings") that opens a Sheet with SessionTerms.
- Hosts keep "Change movies". The dialog shows SessionTerms above the form.
- The Swiper is keyed by poolVersion (decision 6). Resume comes from nextCard (swipe-card plan).

### Lobby (lobby.tsx)
- New panel components/store/session-terms.tsx, titled "Rental terms". It is a paper panel with dotted rows from
  describeSessionSettings and is shown to everyone, below "At the counter".
- page.tsx passes matchMode, mediaType and poolLength.

### Results (match/page.tsx)
- app/sessions/[sessionId]/page.tsx redirects to /match whenever the status is completed, in either mode.
- First mode: unchanged.
- All mode:
  - Heading "Everyone picked these", or "Nobody agreed" when the host ended with no matches.
  - The receipt header moves into a shared `MatchReceiptHeader`: store name, session code, date.
  - One receipt line per agreed Title from `tmdb.getTitle(mediaType, id)`: "Title (yearOf)" with "★ 7.4",
    sorted by rating. Then Agreed N, Renters, Swipes.
  - Below the receipt, a stacked list with a 64px poster thumbnail, `titleLengthLabel`, and a trailer link per title.
  - "Start a new session" stays.

## Risks
- Pool loads grow with add-more (150 or more ids). The page should load cards lazily through nextCard and the
  swipe-card plan.
- The recent matches shelf gets one spine per agreed title. Group it by session, or accept it.
- Re-fetching watchlists can take the 20-second budget. Show a spinner on Add more.
- The migration touches a production database with a live session. Additive only. Apply it before deploying.

## Overlaps
- Swipe-card plan: nextCard, Swiper key, resume.
- Filters plan: getTitlePool exclude/exhausted, describePreferences.
- TV plan: media_type, Title, getTitle, titleLengthLabel, buildPoolFromWatchlists mediaType.

## Steps
1. progress.ts (session functions) and settings.ts, with tests (`npm run test:unit`).
2. Schema columns and the match_history unique index, in the shared 0002. Brian applies it.
3. Lock down updateSessionPreferences; check pool membership in swipeMovie.
4. matchMode in createMovieSession and the new-session form.
5. settleSession, the all-mode branch in swipeMovie, and endSessionNow.
6. Poll route and hook.
7. WaitingCounter and addMoreMovies, once getTitlePool and buildPoolFromWatchlists take exclude.
8. All-mode results page.
9. SessionTerms in the lobby and the settings sheet.
10. Check at phone size with two test accounts:
    - first mode is unchanged
    - all mode ends with several matches
    - zero matches, then two people press Add more at once
    - the host ends early

## Critical files
- actions/db/movies-actions.ts
- db/schema/movies-schema.ts
- lib/sessions/progress.ts
- lib/sessions/settings.ts
- app/sessions/[sessionId]/_components/waiting-counter.tsx
- app/sessions/[sessionId]/_components/swipe-interface.tsx
- app/sessions/[sessionId]/_components/lobby.tsx
- app/sessions/[sessionId]/match/page.tsx
- app/api/sessions/[sessionId]/participants/route.ts
- hooks/use-session-participants.tsx


## Addendum (2026-11-25, from Brian): one Session settings button, resets mid-session
- **The button.** "Choose movies" / "Change movies" becomes a host-only **Session settings** button, in the lobby and on the swipe screen. It opens one dialog that can change every setting:
  - media type
  - match mode
  - filters or watchlists
  This overrides "fixed at creation" above. The new-session page and the dialog share one form component.
- **Server.** `updateSessionSettings(sessionId, { mediaType, matchMode, preferences })` replaces `updateSessionPreferences`. It:
  - is host only, and works while the session is active or started;
  - normalizes the preferences for the new media type and rebuilds the pool with `getTitlePool` or `buildPoolFromWatchlists` (an empty pool is an error and nothing is saved);
  - deletes all swipes;
  - does a conditional update that bumps `pool_version`, and `reset_version` too when the status is started.
- **Confirmation.** Mid-session, the client asks the host first, in an AlertDialog: "Reset everyone's swipes? Saving new settings starts the session over for everyone."
- **Participants.**
  - The poll returns `resetVersion`.
  - The hook keeps the last value it saw. When the value goes up and the viewer isn't the host, it shows a notice (an AlertDialog or a banner in the store look): "The host changed the settings and reset the session. Start swiping again."
  - The Swiper remounts at 1/N, because it is keyed by `poolVersion`.
  - A participant who loads the page after the reset sees no notice, because the hook starts from the server's current value.
- **Non-hosts** never see the button. They get the read-only Rental terms sheet instead.

## Addendum 2 (2026-11-25, from Brian): how it works, and agreed so far
- **How it works.** The swipe screen shows a short "how it works" strip under the status bar that names the mode:
  - First mode: "First tape everyone rents wins."
  - All mode: "Collecting every match: swipe all N, then see the list."
- **Agreed so far.** In all mode it also shows an "Agreed so far: N" chip. Tapping it opens a bottom sheet listing the agreed titles (poster thumbnail, name, year, rating), built with `getEnrichedTitle`, or with the titles already loaded on the page.
- **Poll.** While the session is started in all mode, the poll returns `agreedIds` and `agreedCount`; in first mode it sends `[]`. This replaces the earlier rule that the agreed count is never sent before the end.
- **Lobby.** The Rental terms panel also explains the basics (swipe right to rent, left to pass, and how the session ends).

## Addendum 3 (2026-11-25, from Brian): replaces the "how it works" part of Addendum 2
- **No strip on the swipe screen.**
- **Lobby:** "How it works" appears as a panel in the lobby, where everyone gathers before the start.
- **Swipe screen:** a "?" icon button in the status bar (44px, aria-label "How it works") opens the same content in a bottom sheet.
- **Shared component:** both use one `HowItWorks` component that takes `matchMode`, `mediaType` and `poolSize`.
- **Agreed so far:** the chip and sheet from Addendum 2 stay as they were (all mode only, in the status bar).

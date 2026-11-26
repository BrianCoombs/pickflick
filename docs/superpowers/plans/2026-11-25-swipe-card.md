# Swipe card: back-of-the-box description, length line, resume progress (2026-11-25)

Scope: the swipe card in `app/sessions/[sessionId]/_components/swipe-interface.tsx` and swipe progress.

Follows the shared decisions in `docs/todo.md`. It depends on:
- `lib/titles` from the TV plan: `Title`, `titleLengthLabel`, `yearOf`, `tmdb.getTitle`.
- Migration 0002, for `pool_version`.
- The session-settings plan: `WaitingCounter`, and the poll returning `poolVersion`.

Check every screen at phone size first.

## What exists today

- `page.tsx` fetches the details for every pool id, so the runtime already reaches the card. The prop is typed `Movie[]`, which hides it. After the TV plan, `page.tsx` calls `tmdb.getTitle(mediaType, id)` and passes `Title[]`.
- **Show length.** TMDb shows often have an empty `episode_run_time` but do have `number_of_seasons` and `number_of_episodes`, so TV shows seasons and episodes. Unreleased movies can have a runtime of 0, which shows nothing.
- **Position resets.** `currentIndex` is client state that starts at 0, so a refresh or a rejoin starts again at card 1.
- **The Swiper gets new props mid-session.** `use-session-participants` calls `router.refresh()` when the count, the status or (after the settings plan) `poolVersion` changes. If the server dropped swiped titles while the client kept an index, cards would be skipped. That rules out keeping an index.
- **Rejoining fails.** `joinMovieSession` refuses any status other than "active", so a member can't rejoin a started session by its code.

## Decisions

1. **Progress comes from the swipes table, not a stored index.**
   - `page.tsx` sends the full pool in order, plus this user's swiped ids.
   - The Swiper keeps a set of ids confirmed during this visit (`localSwiped`).
   - The current card is `nextCard(poolIds, serverSwiped ∪ localSwiped).index`.
   - This survives a refresh, a rejoin, a growing pool, and a refresh that lands while a swipe is still saving.
2. **The counter reads "{position} / {total}".**
   - `position` is the number of pool ids already swiped, plus 1.
   - `total` is the pool length.
   - A pool that has grown reads "51 / 100".
3. **The Swiper is keyed by `poolVersion`** (from `page.tsx` through `session-wrapper`).
   - Changing the criteria or adding more titles bumps `pool_version`, and the poll refreshes the page.
   - The Swiper then remounts with `localSwiped` cleared and the swiped ids fresh from the server.
   - So swipes that `updateSessionPreferences` deleted are never carried over.
4. **When `nextCard` returns index -1**, the Swiper shows the settings plan's `WaitingCounter` (`_components/waiting-counter.tsx`) in place of the old "Out of movies" panel. The status bar stays above it.
5. **The full description opens in a bottom sheet**, the "back of the box" (`components/ui/sheet.tsx`, `side="bottom"`).
   - It doesn't push the layout, so `h-[calc(100dvh-60px)]` and the `[container-type:size]` poster are untouched.
   - It's a `role=dialog`, so `swipeKeyDirection` already ignores arrow keys while it's open.
   - The trigger sits in the info block, outside the draggable `motion.div`, so drag-to-swipe is unaffected.

## Pure functions and tests

### `lib/sessions/progress.ts`: `nextCard`

This sits in the same file as the settings plan's functions.

`nextCard(poolIds: number[], swipedIds: Iterable<number | string>) -> { index, position, total }`:
- `index` is the first pool id not yet swiped, or -1 when every one has been.
- `position` is the number of pool ids that are swiped, plus 1.
- `total` is `poolIds.length`.
- `swipes.movie_id` is varchar, so string ids are converted with `Number()`.

Tests in `lib/sessions/progress.test.ts`:
- No swipes gives `{ index: 0, position: 1, total: 3 }`.
- 3 of 5 swiped gives index 3 and position 4.
- A gap: pool `[1, 2, 3]` with 1 and 3 swiped gives index 1 and position 3.
- String ids from the database match number pool ids ("2" counts as 2).
- Swiped ids that aren't in the pool are ignored and don't change the position.
- Every id swiped gives index -1, with position equal to total + 1. The UI hides the counter then.
- An empty pool gives `{ index: -1, position: 1, total: 0 }`.
- A grown pool of 100 ids with the first 50 swiped gives index 50, position 51, total 100.
- Duplicate swiped ids don't count twice.

### `lib/sessions/rules.ts`: `joinDecision`

`joinDecision(status: string, isMember: boolean) -> "join" | "rejoin" | "closed"`

| Who | Status | Result |
|---|---|---|
| Member | active, started or completed | rejoin |
| Non-member | active | join |
| Non-member | started or completed | closed |

### `lib/titles`: `titleLengthLabel`

This belongs to the TV plan; the card only renders it. The cases the card relies on, which go in the TV plan's tests:

| Input | Label |
|---|---|
| Movie, runtime 112 | 1h 52m |
| Movie, runtime 45 | 45m |
| Movie, runtime 0 or null | none |
| TV, 5 seasons and 62 episodes | 5 seasons · 62 episodes |
| TV, 1 season and 1 episode | 1 season · 1 episode |
| TV, seasons known but episodes unknown | 3 seasons |
| TV, nothing known | none |

## File changes

### `app/sessions/[sessionId]/page.tsx`
- When the status is "started", select `swipes.movieId` for this session and user, in the same `Promise.all` as the `getTitle` calls.
- Pass `swipedIds`, `poolVersion` and `titles: Title[]`.

### `session-wrapper.tsx`
- Pass `swipedIds` and `poolVersion` through, and switch the types to `Title`.

### `swipe-interface.tsx`
- **Remount:** `SwipeInterface` renders `<Swiper key={poolVersion} />`.
- **Progress:** drop `currentIndex`. Track `localSwiped` (a `Set<number>`) and compute `nextCard(ids, union(swipedIds, localSwiped))`.
  - After a successful swipe that isn't a match, add the id to `localSwiped`.
  - A failed swipe still springs the card back and adds nothing.
- **Card reset:** the `useLayoutEffect` that resets x depends on `[current?.id]`.
- **Counter:** the status bar reads "{n} swiping · {position} / {total}".
- **End of the pool:** when the index is -1, render `WaitingCounter`.
- **Meta line:** `[yearOf(title), title.genres[0]?.name, titleLengthLabel(title)].filter(Boolean).join(" · ")`.
- **Info block:** keep `line-clamp-2`.
  - Below it, add a "Back of the box ▸" text button (font-mono, underlined, at least `min-h-11` to tap).
  - Show it only when there is an overview.
  - It opens the sheet through `expandedId` state. The sheet only counts as open while `expandedId === current.id`, so it closes itself after any swipe.

### `actions/db/movies-actions.ts`
- `joinMovieSession` uses `joinDecision`.
- "rejoin" returns success without changing `userIds`.
- "closed" keeps the current "Session is no longer active" message.

## The sheet at phone size

- **Look:** `bg-store-paper` with navy text, square corners, an offset shadow and a dashed top rule.
- **Size:** `max-h-[70dvh]`. The body scrolls, with bottom padding `max(1rem, env(safe-area-inset-bottom))`.
- **Contents, in order:**
  - The title in `font-display`.
  - The tagline, if there is one, in `font-marker`.
  - "1999 · Drama, Thriller · 2h 19m", listing all genres.
  - The full overview at `text-sm leading-relaxed`.
- **Closing:** Escape, tapping the backdrop, or the close button.
- **While it's open**, it covers the poster and the buttons, so nobody can swipe while reading.
- **Space check at 375x667:** make sure the poster keeps a sensible height with the extra link row. If space is tight, move the link to the end of the meta line.

## Risks

- **Titles TMDb couldn't load** are dropped from the list, so the counter counts only loaded titles. This matches today's behaviour.
- **A refresh during a swipe** can bring back a slightly out-of-date swipe list. Combining it with `localSwiped` covers that. If the pool changes at the same moment, one card may show again; swiping it again just overwrites the saved swipe.
- **Swipes outside the pool:** once `swipeMovie` rejects ids that aren't in the pool, a swipe sent from an outdated pool fails. The error toast and the refresh on pool change recover from it.
- **Load on big pools:** each refresh fetches details for the whole pool, which is 100 or more after "add more". A follow-up could fetch only unswiped titles.

## Steps

1. Write `nextCard` and `joinDecision` test-first.
2. In `page.tsx`, add the swipes query, `poolVersion` and `Title[]`, and pass them through `session-wrapper`.
3. In the Swiper:
   - key it by `poolVersion`
   - work out the current card with `nextCard`
   - add the counter and the `WaitingCounter` branch
4. Add the rejoin case to `joinMovieSession`.
5. Add the meta line with `titleLengthLabel`.
6. Build the back-of-the-box sheet.
7. Check on a phone at 375x667 and 390x844, against a dev database:
   - Swipe 3, refresh, and land on "4 / 50".
   - Rejoin by code and resume.
   - Swipe everything and see the waiting screen.
   - Change the criteria and see everyone restart.
   - Arrow keys do nothing while the sheet is open.
   - Dragging still swipes.
   - A TV card shows seasons and episodes.
8. Run `npm run types` and `npm run lint`.

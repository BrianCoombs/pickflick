# Pool filters plan: genres, rating, streaming providers (2026-11-25)

Follows the shared decisions in scratchpad/plans/decisions.md. Media type is a
session column (`movie_sessions.media_type`), not part of the preferences.

## Findings (verified 2026-11-25)

- **Genre overlap on phones.** `components/movie-preferences-form.tsx` lays genres out
  as `grid grid-cols-2 gap-3`, each a `flex items-center space-x-2` row of Checkbox
  and Label. The page font is IBM Plex Mono (`body font-mono`), about 8.4px per
  character at `text-sm`, and the columns have fixed widths.
  - 375px: the dialog has about 303px of content, each column about 145px, each label
    about 117px. "Science Fiction" (126px) wraps.
  - 320px: each label gets about 90px. "Documentary" (92px) can't wrap and spills into
    the next column.
  - The shared `Label` has `leading-none`, so wrapped lines sit closer than the font's
    glyphs need and touch or overlap. `items-center` moves the checkbox to the middle
    of the two lines.
  - These widths are calculated, not measured. Check with Playwright after the fix.
- **TMDb `with_genres`.** A comma is AND, a pipe is OR. Action 4,159; Horror 2,209;
  `28,27` 231; `28|27` 6,137. `lib/api/tmdb.ts` uses `join(",")`, which is the bug.
- **One OR query crowds genres out.** The first 60 results for `28|27|99` (sorted by
  popularity) were 48 Action, 15 Horror, 1 Documentary.
- **Providers.** `with_watch_providers` uses the same rules: `8|337` 2,972; `8,337` 22.
  - With `watch_region=US&with_watch_monetization_types=flatrate`, Netflix gives 2,095.
    With no region the filter is ignored (20,001).
  - The same ids work on `/discover/tv` (Netflix with genres `10765|35`: 1,306).
  - The Tubi id (73) gave 20,001 for every monetization type, so free services are out.
- **Per-title providers.** `/movie/{id}?append_to_response=watch/providers` returns
  `["watch/providers"].results.US.{link,flatrate,ads,rent,buy}`.
- **Narrow filters run short of 50.**
  - Drama on Netflix: 6+ with 50+ votes 912; 7+/50 345; 7+/200 247; 8+/200 29.
  - Horror on Netflix, 7+ with 100+ votes: 24.
  - 8+ with 200+ votes: Action 63, Comedy 64, Horror 13.
- **Production `movie_sessions.preferences` (read-only query).** Three shapes:
  `{genres,maxYear,minRating,minYear}`, `{maxYear,minRating,minYear}`, `{mode,sources}`.
- **Current code.**
  - The form hard-codes `minRating = 6`.
  - `vote_count.gte=50` is fixed in `tmdb.ts`.
  - `getMoviePool` tops up short pools with popular movies that ignore the genres.
  - With no genres or years it skips discover entirely.
- **Other.** `package.json` has Tailwind 3.4, not v4 as CLAUDE.md says. The year
  presets stop at "2020 - 2025".

## Decisions

1. **Phone layout.** Replace the checkbox grid with wrapping toggle chips
   (`flex flex-wrap gap-2`). There are no fixed columns, so nothing can overflow.
2. **Multiple genres.** One discover query per chosen genre (one "bucket" each), taking
   from each bucket in turn, so each genre gets an equal share. A short bucket leaves
   the others to fill the gap. Duplicates are dropped. With no genres there is a single
   bucket and no `with_genres`.
3. **Rating.** Four buttons: Any / 6+ (default, as today) / 7+ / 8+.
   - The vote floor is automatic and not shown: `voteFloor` is 0→50, 6→50, 7→100, 8→200.
   - If the pool comes up short, retry once with the floor at 50.
4. **Streaming.**
   - US only, with `region: "US"` saved for later.
   - A hard-coded list of 8 brands with logo paths. TMDb lists 294 providers, mostly
     add-on channels. Some brands span several ids, and ids drift (HBO Max is now 1899).
   - Preferences store brand keys. The server turns them into pipe-joined ids.
   - Monetization is `flatrate` only (subscription; rent and buy don't count).
5. **Watchlist mode.** v1 hides the provider and rating filters. Filtering would mean one
   lookup per title on top of the 20-second Letterboxd budget, and it would shrink pools
   that are already small. The "on Netflix" card badge (from `getTitle`'s
   watch/providers, owned by the card/TV plans) covers most of the value there.
6. **Short pools.** Never pad with titles outside the filters.
   - Return what matches, and the dialog says "Only N titles match these filters."
   - With 0 matches, return an error and save nothing.
7. **Old sessions.** Convert on read with `normalizePreferences(raw, mediaType)`. No data
   migration (the only schema migration is the shared 0002).

## Preferences type (`lib/sessions/preferences.ts`)

```ts
import type { MediaType } from "@/lib/titles/types"   // from the TV plan
export type ProviderKey =
  "netflix" | "prime" | "disney" | "max" | "hulu" | "apple" | "peacock" | "paramount"
export type RatingStep = 0 | 6 | 7 | 8               // 0 = any
export interface FilterPreferences {
  version: 2; mode: "filters"
  genres: number[]                 // OR; empty = any; ids valid for the session's mediaType
  minYear?: number; maxYear?: number
  minRating: RatingStep
  providers: ProviderKey[]         // empty = anywhere
  region: "US"
}
export interface WatchlistPreferences { mode: "watchlists"; sources: WatchlistSourceRef[] }
export type SessionPreferences = FilterPreferences | WatchlistPreferences

export function normalizePreferences(raw: unknown, mediaType: MediaType): SessionPreferences
export function describePreferences(p: SessionPreferences, mediaType: MediaType): string[]
```

**`normalizePreferences(raw, mediaType)`**
- `null`, `undefined` or `{}` becomes filters with genres `[]`, `minRating` 6,
  providers `[]`, region `"US"`.
- No `mode` means an old filter preference: keep genres, years and minRating, and add
  version 2 defaults.
- `{mode:"watchlists", sources: [...]}` passes through, keeping only sources with a valid
  `sourceType`.
- Cleaning:
  - Drop genre ids not in `GENRES[mediaType]`, then de-duplicate.
  - Clamp years to 1900 through next year, and swap them if min > max.
  - Snap minRating down to a step (6.5 → 6; below 6 → 0; above 8 → 8).
  - Drop unknown provider keys.
- Use it on the server in both actions (the input is untrusted) and on the client for
  the form's starting values.

**`describePreferences(p, mediaType)`** returns short lines for the read-only settings
summary shown to non-hosts (session-settings plan):
- Filters: genres ("Action, Horror", or "Any genre"); years ("1990–1999", "1990 or
  later", "Up to 1999", or nothing); rating ("7+ rating", or nothing for Any);
  providers ("Netflix, Hulu", or nothing).
- Watchlists: "From watchlists" plus a source count. The settings plan resolves names.

## Provider list (`lib/constants/providers.ts`, verified 2026-11)

| key | name | TMDb ids | logo_path |
|---|---|---|---|
| netflix | Netflix | 8 | /rK1KljqmbvO9HQa1PBFLILWah72.png |
| prime | Prime Video | 9 | /gMZdpavHmxFNnLpMHwVxfqeux2g.png |
| disney | Disney+ | 337 | /5eZ872CghnHFLB1j8grszbrx0dx.png |
| max | HBO Max | 1899 | /skypuy7SXuugIQeYg0IglmzoKaS.png |
| hulu | Hulu | 15 | /44uAnmSqvA4yBOdbPWN8YgQHjWm.png |
| apple | Apple TV | 350 | /v9SnyvYt0U3KGgBH3Sbh3z4yODe.png |
| peacock | Peacock | 386, 387 | /a1UIdq5BrkcAxnxcUhFsNbXnxeu.png |
| paramount | Paramount+ | 2303, 2616 | /4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png |

- Logo URL: `https://image.tmdb.org/t/p/w92${logo_path}`, as a plain `<img>` like the
  posters (`next.config` has no image.tmdb.org remote pattern).
- Add `providerIds(keys): number[]` and `providerByKey`.
- These ids work for both movie and TV.

## TMDb calls

- **Discover:** `GET /discover/{movie|tv}` (the Bearer token client already in `tmdb.ts`).
  - `sort_by=popularity.desc`, `include_adult=false`, `page=N`
  - `vote_count.gte=<voteFloor>`
  - `vote_average.gte=<minRating>`, left out when the rating is 0
  - `with_genres=<one genre id>` per bucket, left out when no genres are chosen
  - movie: `primary_release_date.gte=YYYY-01-01` / `.lte=YYYY-12-31`
  - tv: `first_air_date.gte` / `.lte`
  - With providers: `with_watch_providers=<ids joined with |>&watch_region=US&with_watch_monetization_types=flatrate`
- **TV genres:** `GET /genre/tv/list`, verified, ids differ from movie genres. Examples:
  10759 Action & Adventure, 10765 Sci-Fi & Fantasy, 10768 War & Politics. Hard-code as
  `TV_GENRES` (TV plan or here; one owner).
- **Provider list (reference only, not called at runtime):**
  `GET /watch/providers/{movie|tv}?watch_region=US`. Sort by `display_priorities.US`.

## Pool function (`lib/api/movie-service.ts` → `getTitlePool`)

```ts
getTitlePool({ mediaType, prefs, size = 50, exclude = [] }):
  Promise<{ ids: number[]; exhausted: boolean }>
```
- Buckets are `prefs.genres` (or one empty bucket).
- `fetchPage(bucket, page)` runs discover with `buildDiscoverParams` and returns result ids
  plus `total_pages`.
- `buildBalancedPool` takes one id from each bucket in turn, skipping excluded and
  already-taken ids, and loads pages lazily.
- `maxPagesPerBucket = min(25, 5 + ceil(exclude.length / 20))`.
- If fewer than `size` and the vote floor is above 50, retry once with the floor at 50,
  keeping the ids already found.
- Shuffle (shared Fisher–Yates `shuffle` moved out of `lib/watchlists/pool.ts`) and
  return up to `size`.
- `exhausted` is true when every bucket ran out of pages before reaching `size`.
- Remove the popular/top-rated branch and the off-filter top-up.
- "Add 50 more" (session-settings plan) calls it with `exclude: session.moviePool`.

## Pure functions and tests (node:test, `npm run test:unit`)

**`lib/sessions/preferences.test.ts`**
- `{}` and `null` give the default filters (genres [], minRating 6, providers [], region US).
- The old `{genres:[28],minYear:1990,maxYear:1999,minRating:6}` keeps those values, gets
  version 2 and providers [].
- The old `{minYear,maxYear,minRating}` keeps its years.
- `{mode:"watchlists",sources:[...]}` passes through; a bad sourceType is dropped.
- Genre 10765 under `"movie"` is dropped and kept under `"tv"`. Genre 28 under `"tv"` is
  dropped.
- minRating 6.5 → 6, 3 → 0, 9 → 8. Years 1800 → 1900; min > max are swapped.
- Unknown provider "tubi" is dropped; duplicate genres are removed.
- `describePreferences`:
  - The defaults give ["Any genre"].
  - Full filters give genre names, "1990–1999", "7+ rating", "Netflix, Hulu".
  - TV genre names come from the TV list.
  - Watchlist preferences give the "From watchlists" line.

**`lib/api/discover-params.test.ts`** — `buildDiscoverParams(mediaType, prefs, { genreId?, page, voteFloor })`
- No genreId: no `with_genres`. With genreId 27: `with_genres="27"`.
- Peacock + Netflix: `with_watch_providers` is "8|386|387" (order follows the table), with
  `watch_region=US` and `monetization=flatrate`. No providers: none of those three keys.
- minRating 0: no `vote_average.gte`. 7: "7".
- `"movie"` uses `primary_release_date.*`; `"tv"` uses `first_air_date.*`; no years, no
  date keys.
- Always: `sort_by=popularity.desc`, `include_adult=false`, `vote_count.gte`.

**`lib/constants`:** `voteFloor` 0→50, 6→50, 7→100, 8→200. `providerIds(["peacock"])` →
[386, 387].

**`lib/api/balanced-pool.test.ts`** — `buildBalancedPool({ bucketCount, fetchPage, size, exclude, maxPagesPerBucket })` with a fake `fetchPage`
- Three large buckets, size 51: 17 from each.
- One bucket has 5 ids: all 5 included, the rest filled from the others, total 50.
- An id in two buckets appears once. Excluded ids never appear.
- Every bucket short: returns all unique ids, `exhausted: true`.
- Never asks for a page beyond `total_pages` or `maxPagesPerBucket`. Pages are loaded
  lazily (bucket 2 page 2 isn't fetched if not needed).

## UI at phone size (`components/movie-preferences-form.tsx`)

- **New props:** `mediaType` (the genre list comes from `GENRES[mediaType]`). The starting
  value comes from `normalizePreferences(initial, mediaType)`.
- **Section order:** Genres → Where to watch → Rating → Years. All are hidden in watchlist
  mode.
- **`ToggleChip`** (local, or `components/store/toggle-chip.tsx`):
  - `<button type="button" aria-pressed>`
  - `min-h-11 px-3 border-2 border-store-navy text-sm whitespace-nowrap`
  - selected: `bg-store-navy text-store-yellow`
  - Chips sit in `flex flex-wrap gap-2`.
- **Genres:** header "Genres" with an "Any genre" link that clears the selection. Hint:
  "Pick a few. We'll mix them evenly."
- **Where to watch (US):** provider chips with a 20px logo and name. Hint: "Subscription
  streaming in the US. Rent/buy not counted."
- **Rating:** `grid grid-cols-4 gap-2`, buttons Any / 6+ / 7+ / 8+ (about 70px each at
  375px).
- **Years:** keep the current preset select and From/To inputs; update the presets
  (add "2020 - 2026", or "2020s").
- **Submit:** `sticky bottom-0 bg-store-paper pt-3` inside the dialog's scrolling area
  (`max-h-[90vh] overflow-y-auto`).
- Submit sends `FilterPreferences` without `mediaType`.

## Files

- `lib/sessions/preferences.ts` and `.test.ts` (new): types, zod schema,
  `normalizePreferences`, `describePreferences`.
- `lib/constants/providers.ts` (new): `STREAMING_PROVIDERS`, `providerIds`, `providerByKey`.
- `lib/constants/movies.ts`: `RATING_STEPS`, `voteFloor`, year presets; `GENRES` keyed by
  media type together with the TV plan's `TV_GENRES`.
- `lib/api/discover-params.ts` and `.test.ts` (new): `buildDiscoverParams`.
- `lib/api/balanced-pool.ts` and `.test.ts` (new): `buildBalancedPool`, plus the shared
  `shuffle` (re-export from `lib/watchlists/pool.ts`).
- `lib/api/tmdb.ts`: replace `discoverMovies` with `discover(mediaType, params)` returning
  `{ ids/results, total_pages }`. `getTitle` belongs to the TV plan.
- `lib/api/movie-service.ts`: `getMoviePool` becomes `getTitlePool`.
- `actions/db/movies-actions.ts`:
  - `createMovieSession` runs `normalizePreferences(raw, mediaType)` then `getTitlePool`.
  - `updateSessionPreferences` does the same with the session's `mediaType`.
  - Both save the version 2 shape; with 0 ids, return an error and don't save.
  - Return `{ failed, poolSize, short }`.
  - The host-only check and pool_version bump belong to the session-settings plan.
- `components/movie-preferences-form.tsx`: chips, providers, rating, sticky submit,
  `mediaType` prop.
- `app/sessions/[sessionId]/_components/criteria-dialog.tsx`: pass `mediaType`; toast
  "Only N titles match these filters" when `short`.
- `lobby.tsx`, `session-wrapper.tsx`, `swipe-interface.tsx`: change `any` to
  `SessionPreferences`.

## Overlaps

- **Swipe-card / TV plans:** `getTitle` (`append_to_response=videos,watch/providers`) gives
  the runtime and the "on Netflix" badge. Use `providerByKey` / the ids in this plan to
  show a brand name. `MediaType` and `Title` come from `lib/titles/`.
- **Session-settings plan:**
  - "Add 50 more" calls `getTitlePool({ mediaType, prefs, exclude: moviePool })` and
    shows a "no more titles" state when `exhausted`.
  - The non-host summary uses `describePreferences`.
  - Watchlist batches use `buildPoolFromWatchlists(sources, uri, { mediaType, exclude })`.
- **TV plan:** the session's `media_type` column runs through
  `normalizePreferences(raw, mediaType)`, `buildDiscoverParams` and `discover`. The vote
  floor may need to be lower for TV; check counts when building.

## Risks

- Each genre costs at least one discover call; a large exclude list costs more pages
  (capped at 25 per genre).
- Popularity sorting gives everyone the same top titles. A random start page from 1 to 3
  is an optional fix.
- Provider ids drift. Re-check the table against `/watch/providers/movie?watch_region=US`
  now and then.
- TMDb's streaming data is not always right.
- Preferences saved under one media type can't carry over to another, because the media
  type is fixed when the session is created.

## Order

1. `preferences.ts` and its tests (after the TV plan's `lib/titles/types`).
2. `providers.ts`, `voteFloor`, `RATING_STEPS`.
3. `buildDiscoverParams` and its tests.
4. `buildBalancedPool`, the shared shuffle, and their tests.
5. `tmdb.discover`.
6. `getTitlePool`.
7. Both actions.
8. Form: chips (the overlap fix), providers, rating, sticky submit.
9. Dialog toast; `SessionPreferences` types in the session components.
10. `npm run test:unit`, `npm run types`, then Playwright at 320 and 375px.

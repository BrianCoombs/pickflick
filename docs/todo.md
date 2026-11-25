# Stop swiping once the session has a match

The previous plan (review follow-ups for the video store redesign) is in git history.

Pure logic gets a failing unit test first (`npm run test:unit`).

- [x] 1. `acceptsSwipes(status)` in `lib/sessions/rules.ts`: only "started" takes swipes (test first)
- [x] 2. `swipeMovie`: a swipe on a completed session returns `matched: true` without recording anything; other non-started sessions are refused
- [x] 3. `checkForMatch`: mark the session completed only `WHERE status = 'started'`, and write `match_history` only for the update that won, so the first match is the only one
- [x] 4. Participants poll: on status "completed", go straight to `/sessions/:id/match` (no lobby flash on the way)

## Review

- Before: the match set `status = "completed"`, but `swipeMovie` never checked status. Everyone else found out from the 3-second poll, which read "completed" as "not started", briefly showed the lobby, refreshed, and only then redirected. Swipes in that gap were still recorded and could pick a second movie, overwriting `matched_movie_id` and adding another history row. Two final swipes at the same moment could do the same.
- After: late swipes are not recorded and send the swiper to the match page. The completing update is conditional, so Postgres lets one of two simultaneous matches win; the loser still goes to the match page and sees the winner. The poll redirects on "completed" directly.
- Checked: unit tests (47 pass), `tsc --noEmit`, eslint. Not run end to end against a live session; this branch isn't merged or deployed.

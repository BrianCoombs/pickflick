# Review follow-ups for the video store redesign

The previous plan (video store redesign) is in git history.

Pure logic gets a failing unit test first (`npm run test:unit`).

- [x] 1. swipeMovie: only session members can swipe; reject any direction but "left"/"right"; match needs a like from every current member, and old "super" rows still count as likes (lib/sessions/rules.ts)
- [x] 2. getRecentMatches: clamp limit to 1..20, order by match_history.matchedAt
- [x] 3. Session page: skip the watchlist lookup once started; empty people list if it throws
- [x] 4. Lobby: "N people" when the list is empty; Start shows "Starting..." until the screen flips
- [x] 5. Swipe screen: poster case stays 2:3 (container query units); reset x before paint on the next card; break-words on the no-poster title; onError falls back to the title
- [x] 6. Contrast: darker red (`store.red-ink` #b8001f) for small red text on paper and red fills behind small text; criteria "Loading..." in neutral-600
- [x] 7. /sessions subtitle says active sessions are waiting in the lobby
- [x] 8. tailwind darkMode "class"; drop the dark: class in alert.tsx

## Review

- `lib/sessions/rules.ts` holds the swipe rules (direction check, membership, "everyone liked", recent-matches limit) with tests in `rules.test.ts`. `swipeMovie` loads the session first and refuses non-members and anything but left/right. `checkForMatch` now needs a like from each current member, so swipes from someone outside the session can't fill a member's place; `super` still counts as a like.
- `getRecentMatches` reads `match_history` joined to the session and orders by `matched_at`.
- Session page skips the watchlist lookup once started and falls back to `[]` if it throws.
- Lobby shows "N people" when there's no list; Start stays disabled with "Starting..." until the poll swaps screens (re-enabled if starting fails).
- Swipe poster: the poster area is a size container and the case is `width: min(100cqw, 100cqh * 2/3)` with `aspect-ratio: 2/3`, checked in headless Chrome at 360×700, 360×300, 700×300 and 320×1000 (all exactly 0.6667). `x` resets in a layout effect on `currentIndex`. Failed poster loads show the title fallback, which now wraps.
- New colour `store.red-ink` (#b8001f, ~6.1:1 on paper). Used for small red text on paper (session code label, auth links, Privacy link, Select some/Clear all, match receipt title), the destructive toast and destructive button fills, and `--destructive` (error text on paper cards). Brand red stays for headings, shadows and the RENT IT stamp border.
- Tailwind `darkMode: "class"`; no `prefers-color-scheme` rules in the built CSS.
- Not run against real data (no DB or TMDb keys in this session).

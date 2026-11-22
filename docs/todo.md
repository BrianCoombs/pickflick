# Review follow-ups for the video store redesign

The previous plan (video store redesign) is in git history.

Pure logic gets a failing unit test first (`npm run test:unit`).

- [ ] 1. swipeMovie: only session members can swipe; reject any direction but "left"/"right"; match needs a like from every current member, and old "super" rows still count as likes (lib/sessions/rules.ts)
- [ ] 2. getRecentMatches: clamp limit to 1..20, order by match_history.matchedAt
- [ ] 3. Session page: skip the watchlist lookup once started; empty people list if it throws
- [ ] 4. Lobby: "N people" when the list is empty; Start shows "Starting..." until the screen flips
- [ ] 5. Swipe screen: poster case stays 2:3 (container query units); reset x before paint on the next card; break-words on the no-poster title; onError falls back to the title
- [ ] 6. Contrast: darker red (`store.red-ink` #b8001f) for small red text on paper and red fills behind small text; criteria "Loading..." in neutral-600
- [ ] 7. /sessions subtitle says active sessions are waiting in the lobby
- [ ] 8. tailwind darkMode "class"; drop the dark: class in alert.tsx

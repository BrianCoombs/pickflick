# Video store redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every PickFlick screen a 90s video store look with a custom store prop per screen, phone-first, plus drag-to-swipe.

**Architecture:** Global palette and fonts via CSS variables and `next/font`, so shadcn pieces inherit the look; a small `components/store/` kit (logo, sticker, VHS case, tape spine, paper panel, receipt) reused across screens; per-screen markup rewrites. New behaviour is limited to drag-to-swipe, the lobby people list, the recent-matches shelf and the receipt's swipe count. Pure logic gets unit tests; screens are checked by phone-size screenshots.

**Tech Stack:** Next.js 16, Tailwind 3, shadcn/ui, framer-motion 11, Drizzle/Neon, `node --test` via tsx.

**Spec:** `docs/superpowers/specs/2026-11-21-video-store-redesign-design.md` (mockups: `.superpowers/brainstorm/59802-1795310659/content/vhs-copy.html` option B, `screens.html`)

The previous plan (watchlist pools) is in git history.

## Global Constraints

- Palette: navy `#0d1b4c`, yellow `#ffd400`, red `#e4002b`, pink `#ff5fa2`, paper `#f4f1ea`, tape `#1c1c1c`/`#2b2b2b`, text `#dfe5ff`/`#9fb0ff`.
- Fonts: Bungee (headings, buttons, uppercase), IBM Plex Mono (body), Permanent Marker (stickers only).
- Square corners; buttons have a hard 3px offset shadow (red under yellow, black under paper).
- No light/dark toggle; no `next-themes`.
- Phone first: no horizontal scroll at 360px; tap targets ≥ 44px; swipe screen fits a 390×844 viewport; use `dvh`.
- Copy exactly as in the spec; no slogans or jokes. Front page: "What are we watching?" / "Swipe with your friends until you all like the same movie." / "Start a session" / sticker "New: pull movies from your watchlists" / "New: watchlists" steps.
- Swipe choices: Pass and Rent it only. Server still counts stored `super` rows as likes.

## Review Focus

1. Dragging the poster on a phone while the page could scroll → horizontal drag swipes, vertical drag scrolls, buttons never fire from a drag.
2. A movie with no poster or no trailer → sleeve shows the title on tape black; match page hides Watch trailer and still offers Start a new session.
3. Long movie titles and long participant names at 360px → wrap or truncate, never overflow.
4. A user with no past matches or no active sessions → shelf and extra cases hidden, no empty frames.
5. Rapid double tap on Rent it, or a drag release during a pending swipe → one swipe recorded.

---

### Task 1: Foundation (fonts, palette, no theme toggle)

**Files:** `app/layout.tsx`, `app/globals.css`, `tailwind.config.ts`, `components/utilities/providers.tsx`, `components/ui/button.tsx`, delete `components/utilities/theme-switcher.tsx`.

- [x] Load Bungee, IBM Plex Mono (400, 600), Permanent Marker with `next/font/google` as CSS vars `--font-display`, `--font-mono`, `--font-marker`; body uses mono.
- [x] Rewrite `:root` shadcn variables for the store palette (background navy, card/popover paper with navy text, primary yellow, destructive red, radius 0); drop the `.dark` block.
- [x] Tailwind: `colors.store.{navy,yellow,red,pink,paper,tape,ink,mist}`, `fontFamily.{display,mono,marker}`, `boxShadow.{offset-red,offset-black}`.
- [x] `@layer components`: `.store-heading` (Bungee yellow, red text-shadow), `.paper` panel.
- [x] Button: square, Bungee uppercase; `default` = yellow + red offset shadow, `secondary`/`outline` = paper + black offset shadow; min height 44px.
- [x] Remove `next-themes` provider and `ThemeSwitcher` usages.
- [x] `npm run type-check && npm run build` pass. Commit.

### Task 2: Store kit + pure helpers (TDD)

**Files:** Create `components/store/{logo,sticker,vhs-case,tape-spine,paper,receipt}.tsx`, `lib/store/format.ts` + test, `lib/store/swipe.ts` + test.

**Produces:**
- `formatRuntime(minutes: number | null | undefined): string | null` (`170` → `"2h 50m"`, `45` → `"45m"`, `0`/null → `null`)
- `linkedListLabel(sources: { sourceType: "trakt" | "letterboxd" }[]): string` (`[]` → `"no list"`, both → `"Trakt + Letterboxd"`, Trakt first)
- `swipeDecision(offsetX: number, velocityX: number, width: number): "left" | "right" | null` (|offset| ≥ 30% of width, or |velocity| ≥ 500 px/s in the offset's direction with |offset| ≥ 40px)
- Components: `Logo`, `Sticker`, `VhsCase`, `TapeSpine`, `Shelf`, `Paper`, `Receipt` (presentational)

- [x] Write tests for the three helpers with the values above; run → fail (module missing).
- [x] Implement; run → pass.
- [x] Build the components to the mockups. Commit.

### Task 3: Header and app shell

**Files:** `components/header.tsx`, `app/sessions/layout.tsx` (new), `app/(marketing)/layout.tsx`, `app/settings/layout.tsx`, `app/(auth)/layout.tsx`.

- [x] Header: `Logo` (→ `/sessions` signed in, `/` signed out); desktop inline links Sessions / Profile / Sign out (signed in) or Log in / Sign up; phones get a menu button opening the same links on paper. Prop `compact` for the swipe screen.
- [x] `app/sessions/layout.tsx` renders the header around session screens; session page uses a `100dvh`-aware layout.
- [x] Auth layout: header + centred content. Commit.

### Task 4: Front page

**Files:** `components/landing/hero.tsx` (rewrite), `components/landing/watchlist-steps.tsx` (new), `app/(marketing)/page.tsx`; delete `components/landing/features.tsx` and unused `components/magicui/*`.

- [x] Hero with spec copy, Start a session (→ `/sessions/new` signed in, `/signup` signed out), shelf of 3 spines + sticker; keep the `clicked_get_started` capture.
- [x] "New: watchlists" paper panel with the three steps. Commit.

### Task 5: Sessions, new, join

**Files:** `app/sessions/page.tsx`, `app/sessions/new/page.tsx`, `app/sessions/join/page.tsx`, `actions/db/movies-actions.ts`.

**Produces:** `getRecentMatches(limit = 8): Promise<ActionState<{ sessionId: string; title: string }[]>>` (completed sessions with a matched movie, newest first; titles via `MovieService.getEnrichedMovie`; skip ones TMDb can't load).

- [x] Sessions: headline, New session case (sticker "New"), Join with a code case, active sessions as cases ("Session abcd1234 · N people"), "Recent matches" shelf linking to `/sessions/[id]/match` (hidden when empty), watchlist link.
- [x] New and join: paper panels, square inputs, same copy/behaviour. Commit.

### Task 6: Lobby

**Files:** `app/sessions/[sessionId]/page.tsx`, `swipe-interface.tsx` (waiting branch), `session-wrapper.tsx`.

- [x] Page loads people via `getSessionWatchlistOptions(sessionId)` and passes `people` down (the existing 3s poll's `router.refresh` keeps it fresh).
- [x] Waiting screen: heading ("Waiting for everyone" host / "Waiting for the host" others), dashed rental card with code + copy/share, "At the counter · N" list via `linkedListLabel`, host buttons Choose Movies (paper, existing dialog) and Start (yellow) pinned bottom with safe-area padding, Cancel session as a small link. Commit.

### Task 7: Swiping + drag

**Files:** `swipe-interface.tsx` (swiping branch), `actions/db/movies-actions.ts` (narrow `swipeMovie` param to `"left" | "right"`).

- [x] Remove super: up button, ArrowUp, hint text; types `"left" | "right"`; match query unchanged.
- [x] Layout: compact header, status line (`N swiping`, `i / total`, criteria + delete as small controls), poster in clamshell sleeve with rating sticker, year · first genre, 2-line overview, Pass / Rent it pinned bottom. No-poster fallback: title on tape black.
- [x] Drag: `drag="x"`, `useMotionValue` x → rotate and stamp opacities; `onDragEnd` uses `swipeDecision`, springs back otherwise; disabled while a swipe is pending; `touch-action: pan-y`.
- [x] One swipe per card under double taps and drag-during-pending. Commit.

### Task 8: Match receipt

**Files:** `app/sessions/[sessionId]/match/page.tsx`.

- [x] Heading "Everyone picked it", poster (beside receipt on ≥ md), `Receipt` with PICKFLICK VIDEO, session code + date, title (red), genre · `formatRuntime`, TMDb rating, Renters (userIds length), Swipes (count of `swipes` rows for the session). Watch trailer (hidden if none) + Start a new session. Commit.

### Task 9: Profile, auth, privacy, dialogs

**Files:** `app/settings/page.tsx`, `app/settings/_components/watchlist-sources.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(marketing)/privacy/page.tsx`, `components/ui/*` as needed.

- [x] Profile as membership card: email, "Member since" from `user.createdAt` when present, Trakt and Letterboxd stamp rows with existing controls and messages, Trakt notice + Privacy.
- [x] Login/signup on a paper "Membership" card; same fields and Google button.
- [x] Privacy on a paper panel. Dialogs/toasts/inputs: square, paper, offset shadow. Commit.

### Task 10: Docs, verify, review, ship

- [x] README/CLAUDE.md: remove super like / ↑ docs; one line on the look.
- [x] `npm run type-check`, `npm run lint`, `npm run test:unit`, `npm run build`.
- [x] Phone-size pass (Playwright iPhone viewport, touch) on every screen: front page, login, signup, sessions, new, join, lobby (host + guest, 2 test accounts), swiping incl. drag, match, profile, privacy; desktop spot check. Delete test accounts and sessions after.
- [x] Final review subagent; fix pass.
- [ ] Ask Brian before pushing `main` (deploys production).

## Review

- Built as designed: store palette and fonts, components/store kit, new front page, VHS-case
  sessions screen with a recent-matches shelf, lobby with rental card and "At the counter" list,
  swipe screen with clamshell poster, Pass / Rent it and drag-to-swipe, receipt match screen,
  membership-card profile, restyled sign-in, privacy, dialogs and toasts. Light/dark toggle and
  super like removed.
- Also fixed: match page now blocks people who aren't in the session.
- Checks: type-check, lint, 38 unit tests, build; Playwright phone pass on every screen with two
  throwaway accounts (deleted after), 360px overflow sweep, drag tested (short drag springs back,
  long drag swipes).
- Final review: no critical issues. Fixed controls unlocking after a match, arrow keys leaking from
  dialogs, and the status bar clipping at 360px.
- Follow-up: swipeMovie doesn't check session membership (pre-existing).


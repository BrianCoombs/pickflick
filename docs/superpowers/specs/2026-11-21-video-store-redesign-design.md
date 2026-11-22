# Video store redesign: design

Date: 2026-11-21. Builds on `main` after the watchlist feature shipped.

## Intent

PickFlick looks like a generic AI-made template: a gradient pill badge, a big centered
headline over a blurred glow, gradient icon cards, a six-card feature grid, and default
shadcn screens inside the app. Brian wants it to feel like a 90s video rental store, and
wants the front page to tell people about the new watchlist feature. Copy must be plain
and short; Brian rejected copy that was clever, overworked or over-explained.

## Goals

- A video store look on every main screen, with a custom store prop per screen
  (approach 2, chosen by Brian over a theme-only restyle).
- Front page announces watchlists.
- Works well on phones first (Brian: "make sure it works on mobile"), then scales up to
  desktop.
- Remove the light/dark toggle (Brian).
- Swiping has two choices only: Pass and Rent it (Brian).
- Drag-to-swipe on the poster (Brian, new feature: the current screen has no drag).

## Non-goals

- New matching behaviour. Match logic, pool building and watchlists stay as they are.
- Redesigning the stub pages (`/about`, `/contact`, `/pricing`) beyond the global fonts
  and colours they inherit.
- A light theme.

## Anti-goals

- Copy that sounds AI-written: slogans, puns, setup-and-punchline lines, explaining the
  joke. Each line says what happens. ("Be kind, rewind" was cut by Brian for this reason.)
- Props that make posters hard to read or crowd the swipe screen on a phone.
- Claims about features that don't exist (the current page advertises AI suggestions,
  Plex, streaming services and saved favorites; none exist).

## Approaches considered

1. **Theme tokens plus a few signature touches.** Swap colours and fonts globally, rebuild
   the front page, add sticker and button styles. Cheapest.
2. **Custom store pieces per screen.** VHS cases, store counter, clamshell poster sleeve,
   rental receipt, membership card. More work, more character.

**Chosen: 2, by Brian.** Global tokens from approach 1 are still the foundation.

## Look (approved in mockups)

- **Palette:** navy `#0d1b4c` background, marquee yellow `#ffd400`, red `#e4002b`
  (offset shadows, accents), sticker pink `#ff5fa2`, off-white label paper `#f4f1ea`,
  tape black `#1c1c1c` / `#2b2b2b`, soft blue text `#dfe5ff` / `#9fb0ff`.
- **Type:** Bungee for headings and buttons (uppercase), IBM Plex Mono for body text,
  Permanent Marker for stickers only. Loaded with `next/font/google`.
- **Buttons:** square corners, Bungee, hard offset shadow (3px 3px, red on yellow
  buttons, black on paper buttons). No gradients, no rounded pills.
- **Stickers:** pink, Permanent Marker, slight rotation, hard black shadow. Used for "New"
  and the rating price tag.
- **Labels/panels:** off-white paper on navy, dark text, dashed or dotted rules.

## Copy (approved)

- Front page headline: "What are we watching?"
- Sub line: "Swipe with your friends until you all like the same movie."
- Primary button: "Start a session".
- Sticker: "New: pull movies from your watchlists".
- Watchlist section titled "New: watchlists" with three steps:
  1. Link Trakt or Letterboxd on your profile.
  2. In the lobby, the host picks whose lists to use.
  3. You swipe on movies people already wanted to see.
- Other screens use short plain labels as in the mockups ("New session", "Join with a
  code", "Waiting for everyone", "At the counter", "Everyone picked it", "Watch trailer").

## Screens

Mobile layout is the reference (mocked at 300–375px wide). Desktop centres the same layout
in a max-width column (about 480px for app screens) unless noted.

### Header (all screens)

Yellow tilted "PICKFLICK" logo block, links to `/` (signed out) or `/sessions` (signed
in). On phones a menu button opens Sessions, Profile, Sign out. On desktop those show
inline. Remove `ThemeSwitcher` and the `next-themes` provider; the app is always the
navy theme. Add the header to app screens that lack it today (sessions, lobby, swipe,
match, join, new); the swipe screen can use a compact version so the poster fits.

### Front page `/`

Hero with headline, sub line, Start a session button, a shelf of 3 VHS spines and the
pink "New" sticker. Below: the off-white "New: watchlists" panel with the three steps.
Replace the current hero and the six-card features grid entirely. Signed-in visitors'
Start button goes to `/sessions/new`; signed-out to `/signup`.

### Sessions `/sessions`

Headline "What are we watching?". Two VHS clamshell cases: "New session" (with "New"
sticker → `/sessions/new`) and "Join with a code" (→ `/sessions/join`). Active sessions
the user is in (today's list) render as further cases. Under a "Recent matches" label, a
shelf of tape spines showing titles of the user's past matched movies (new; data from
`getSessionHistory` + TMDb titles), each linking to that session's match page. Hide the
shelf when there are none. Keep the "Link your Trakt or Letterboxd watchlist" link.

### New session `/sessions/new` and join `/sessions/join`

Same header and headline style; forms sit on off-white label panels; inputs square with a
thick navy border. Keep the existing genre/year form and hint text.

### Lobby (waiting screen in `swipe-interface.tsx`)

Headline "Waiting for everyone" (host) or "Waiting for the host" (others). Session code
on a dashed-border rental card with copy and share buttons. "At the counter · N" panel
listing each participant's name and their linked list ("Letterboxd", "Trakt", "Trakt +
Letterboxd", "no list"), new: needs a server action returning names and sources (reuse
`getSessionWatchlistOptions`). Host sees Choose Movies (paper button) and Start (yellow)
pinned near the bottom for thumb reach; Cancel session as a small text link.

### Swiping

Compact header and a status line ("3 swiping", "12 / 50"). Poster inside a black
clamshell sleeve; TMDb rating as a pink price-tag sticker on the corner. Year, genre and
a 2-line overview under it. Two buttons pinned to the bottom: **Pass** (paper) and
**Rent it** (yellow).

**Drag-to-swipe (new, approved by Brian):** the poster sleeve can be dragged horizontally
(framer-motion `drag="x"`). It leans with the drag; a "PASS" stamp (paper) or "RENT IT"
stamp (yellow) fades in on the matching side as it moves. Past a threshold (roughly 30%
of card width, or a fast flick) it flies off and records the same swipe as the button;
otherwise it springs back. Vertical page scroll must still work, and the bottom buttons
must not be triggered by a drag. Buttons and Left/Right arrow keys keep working.

Remove the super like: the up
button, the ArrowUp shortcut and the "↑ Super Like" hint; narrow the client type to
`"left" | "right"`. The server keeps counting existing `super` rows as likes so old
sessions are unaffected. Criteria dialog and "no more movies" state use the same panels.

### Match `/sessions/[id]/match`

Headline "Everyone picked it". Off-white receipt with zig-zag bottom edge: store name
"PICKFLICK VIDEO", session code and date, movie title in red Bungee, genre · runtime and
rating, then "Renters" (participant count) and "Swipes" (total swipes in the session). No
jokes on the receipt. Poster above or beside the receipt on wider screens. Watch trailer
button (existing trailer URL) at the bottom, hidden when there is no trailer, and a
secondary "Start a new session" button (Claude's call, so the page never dead-ends). The
receipt uses the TMDb rating; the extra IMDb/Rotten Tomatoes rows and the long overview
are dropped (Claude's call, to keep the receipt short).

### Profile `/settings`

A store membership card: name/email, "Member since" (account created date if available,
otherwise omit), and Trakt and Letterboxd as two stamp rows with the existing connect /
disconnect / username controls and messages. Trakt notice and Privacy link stay.

### Login and signup

Sign-up framed as "Membership" on an off-white card; existing email/password and Google
buttons restyled. No behaviour change.

### Toasts and dialogs

Toasts and dialogs use paper panels with navy text and the offset shadow, square corners.

## Mobile requirements

- Every screen usable at 360px wide without horizontal scrolling.
- Tap targets at least 44px tall; primary actions reachable at the bottom on phones
  (lobby and swipe pin them; respect safe-area insets).
- Swipe screen fits poster, meta and buttons in one phone viewport (no scroll needed on a
  typical 390×844 screen); use `dvh` units.
- Check each screen in a mobile viewport before calling it done (Claude's call on how):
  a manual pass with Playwright at iPhone size and screenshots, signed in, using a couple
  of throwaway test accounts and a test session for the lobby and match screens, all
  deleted afterwards. No committed e2e suite. Drag-to-swipe also gets checked with
  touch emulation.

## Left to the builder

- Component breakdown and names (e.g. `VhsCase`, `Sticker`, `Receipt`), and whether to
  map the palette onto existing shadcn CSS variables or add Tailwind colours, or both.
- Exact spacing, sizes and rotations, matching the approved mockups in
  `.superpowers/brainstorm/` (vhs-copy.html, screens.html).
- How "Swipes" on the receipt is counted (a count of rows in `swipes` for the session is
  fine).
- What the stub pages inherit beyond global fonts and colours.

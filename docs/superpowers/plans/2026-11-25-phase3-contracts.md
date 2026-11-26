# Phase 3 UI contracts (2026-11-25)

Three agents build the screens at the same time. Each owns its own files, so
the components they share are pinned down here. Build to these props exactly.
If you need a change, don't edit another agent's file: note it in your report.

## Ownership

**E, the swipe screen.**
- `app/sessions/[sessionId]/page.tsx`
- `_components/session-wrapper.tsx`
- `_components/swipe-interface.tsx`
- `_components/use-session-controls.ts`

**F, the settings form.**
- `components/session-settings-form.tsx` (new; replaces `components/movie-preferences-form.tsx`)
- `components/store/toggle-chip.tsx`
- `components/watchlist-picker.tsx`
- `app/sessions/new/page.tsx`
- `_components/session-settings-dialog.tsx` (new; replaces `_components/criteria-dialog.tsx`)
- Once nothing imports them, delete `criteria-dialog.tsx` and `movie-preferences-form.tsx`.

**G, the lobby, waiting and results screens.**
- `_components/lobby.tsx`
- `_components/waiting-counter.tsx`
- `components/store/session-terms.tsx`
- `components/store/how-it-works.tsx`
- `components/store/agreed-so-far.tsx`
- `components/store/reset-notice.tsx`
- `lib/sessions/settings.ts` and its test
- `app/sessions/[sessionId]/match/page.tsx`
- `app/sessions/page.tsx`

`_components` means `app/sessions/[sessionId]/_components`.

## Shared types

These already exist:
- `Title` and `MediaType` from `lib/titles/title`
- `MatchMode` and `NextStep` from `lib/sessions/progress`
- `SessionPreferences` from `lib/sessions/preferences`
- `WatchlistOption` from `actions/db/watchlist-actions`. This is the type of `people`; it has `userId` and `name`.

## F exports

```tsx
// _components/session-settings-dialog.tsx
// Host only. Renders its own trigger button, "Session settings" with a Settings2 icon.
// variant "lobby": save rebuilds the pool, no confirm.
// variant "swiping": save first shows an AlertDialog,
//   "Reset everyone's swipes? Saving new settings starts the session over for everyone."
// Calls updateSessionSettings, shows toasts (failed watchlists, "Only N titles match"),
// then router.refresh().
export function SessionSettingsDialog(props: {
  sessionId: string
  mediaType: MediaType
  matchMode: MatchMode
  preferences: SessionPreferences
  variant: "lobby" | "swiping"
}): JSX.Element

// components/session-settings-form.tsx (used by the new page and the dialog)
export function SessionSettingsForm(props: {
  initial: { mediaType: MediaType; matchMode: MatchMode; preferences: SessionPreferences }
  sessionId?: string // for watchlist options in the dialog
  submitLabel: string
  submitting: boolean
  onSubmit: (settings: { mediaType: MediaType; matchMode: MatchMode; preferences: SessionPreferences }) => void
}): JSX.Element
```

## G exports

```tsx
// components/store/how-it-works.tsx
export function HowItWorks(props: { matchMode: MatchMode; mediaType: MediaType; poolSize: number }): JSX.Element // panel, used in the lobby
export function HowItWorksButton(props: { matchMode: MatchMode; mediaType: MediaType; poolSize: number }): JSX.Element // "?" icon (44px, aria-label "How it works") plus a bottom sheet holding <HowItWorks/>

// components/store/session-terms.tsx
export function SessionTerms(props: { mediaType: MediaType; matchMode: MatchMode; preferences: SessionPreferences; poolSize: number; people: WatchlistOption[] }): JSX.Element // "Rental terms" panel
export function SessionTermsButton(props: same as SessionTerms): JSX.Element // Info icon (44px, aria-label "Session settings") plus a sheet; for non-hosts on the swipe screen

// components/store/agreed-so-far.tsx (all mode only; the caller decides whether to render it)
export function AgreedSoFar(props: { titles: Title[] }): JSX.Element // chip "Agreed so far: N" plus a sheet listing poster, name, year, rating

// components/store/reset-notice.tsx
export function ResetNotice(props: { open: boolean; onAcknowledge: () => void }): JSX.Element
// AlertDialog: "The host changed the settings and reset the session. Start swiping again." Button: "Start swiping".

// _components/waiting-counter.tsx (replaces "Out of movies" when nextCard index is -1)
export function WaitingCounter(props: {
  sessionId: string
  mediaType: MediaType
  matchMode: MatchMode
  isHost: boolean
  people: WatchlistOption[]
  progress: { userId: string; remaining: number }[]
  nextStep: NextStep | null
  poolSize: number
}): JSX.Element // calls addMoreMovies / endSessionNow, then router.refresh()

// _components/lobby.tsx
export function Lobby(props: {
  sessionId: string
  isHost: boolean
  participantCount: number
  people: WatchlistOption[]
  preferences: SessionPreferences
  mediaType: MediaType
  matchMode: MatchMode
  poolSize: number
}): JSX.Element
// Host: <SessionSettingsDialog variant="lobby" .../> in place of the old Choose Movies button.
// Everyone: <HowItWorks/> and <SessionTerms/>.
```

## E wiring (swipe-interface.tsx)

- **Status bar, left:** "{n} swiping · {position}/{total}".
- **Status bar, right:**
  - `AgreedSoFar`, in all mode only. Its titles are `agreedIds` mapped onto the titles already loaded.
  - `HowItWorksButton`.
  - For the host: `SessionSettingsDialog variant="swiping"` and the delete button.
  - For non-hosts: `SessionTermsButton`.
- **When `nextCard` index is -1:** render `WaitingCounter`.
- **Reset:** `<ResetNotice open={wasReset} onAcknowledge={acknowledgeReset}/>` from the hook.
- **Data:** `page.tsx` loads `people` while the session is started as well as in the lobby.

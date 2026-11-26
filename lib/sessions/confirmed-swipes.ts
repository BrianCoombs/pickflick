// Swipes the server confirmed during this visit, kept above the swipe deck so
// they survive the deck remounting on a new pool. The page's own swiped ids
// can lag behind (a refresh that rendered before a swipe saved), and without
// these a just-swiped card could come back.
//
// They're tagged with reset_version: Add more grows the pool and keeps
// everyone's swipes, but a host reset deletes them, so the list starts over.

export interface ConfirmedSwipes {
  resetVersion: number
  ids: ReadonlySet<string>
}

export const emptyConfirmed = (resetVersion: number): ConfirmedSwipes => ({
  resetVersion,
  ids: new Set()
})

// The ids that still count at this reset version
export function confirmedFor(
  state: ConfirmedSwipes,
  resetVersion: number
): ReadonlySet<string> {
  return state.resetVersion === resetVersion ? state.ids : new Set()
}

// swipedAt is the reset version when the swipe started. A swipe that began
// before a reset and lands after it doesn't count.
export function addConfirmed(
  state: ConfirmedSwipes,
  swipedAt: number,
  resetVersion: number,
  id: string
): ConfirmedSwipes {
  if (swipedAt !== resetVersion) return state
  const ids = new Set(confirmedFor(state, resetVersion))
  ids.add(id)
  return { resetVersion, ids }
}

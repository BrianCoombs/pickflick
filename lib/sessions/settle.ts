import {
  agreedTitles,
  BATCH_SIZE,
  everyoneDone,
  memberProgress,
  nextStep,
  type MatchMode,
  type MemberProgress,
  type NextStep,
  type SwipeRow
} from "./progress"

// movie_sessions.movie_pool is untyped jsonb. Read it as positive whole TMDb
// ids, in order; anything else is dropped.
export function parsePool(raw: unknown): number[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap(value => {
    const id = typeof value === "string" ? Number(value) : value
    return typeof id === "number" && Number.isInteger(id) && id > 0 ? [id] : []
  })
}

// swipes.movie_id is varchar and the pool stores numbers
export function isInPool(pool: number[], movieId: string | number): boolean {
  const id = String(movieId)
  return pool.some(p => String(p) === id)
}

// What completing a session writes: matched_movie_id (first mode only) and
// one match_history row per title
export interface Completion {
  matchedMovieId: string | null
  movieIds: string[]
}

export interface SettleDecision {
  progress: MemberProgress[]
  done: boolean
  agreed: string[]
  step: NextStep
  completion: Completion | null
}

// Where a session stands from its saved swipes, and whether it should complete
// now. Only a started session completes:
// - all mode, once everyone has swiped every title and something was agreed
// - first mode, as soon as a title is agreed. swipeMovie normally gets there
//   first; this catches a match whose swipe saved but whose request failed.
export function settleDecision({
  matchMode,
  status,
  userIds,
  pool,
  swipes
}: {
  matchMode: MatchMode
  status: string
  userIds: string[]
  pool: number[]
  swipes: SwipeRow[]
}): SettleDecision {
  const progress = memberProgress(userIds, pool, swipes)
  const done = everyoneDone(userIds, pool, swipes)
  const agreed = agreedTitles(userIds, pool, swipes)
  const step = nextStep(matchMode, done, agreed.length)

  let completion: Completion | null = null
  if (status === "started") {
    if (matchMode === "all" && step === "finish") {
      completion = { matchedMovieId: null, movieIds: agreed }
    } else if (matchMode === "first" && agreed.length > 0) {
      completion = { matchedMovieId: agreed[0], movieIds: [agreed[0]] }
    }
  }

  return { progress, done, agreed, step, completion }
}

// The host can change settings in the lobby or mid-session. Mid-session it
// deletes everyone's swipes, so it counts as a reset.
export function settingsChange(status: string): {
  allowed: boolean
  reset: boolean
} {
  const allowed = status === "active" || status === "started"
  return { allowed, reset: status === "started" }
}

// A pool smaller than one batch: the client says "Only N titles match"
export function isShortPool(size: number, target = BATCH_SIZE): boolean {
  return size < target
}

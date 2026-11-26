import { everyoneLiked } from "./rules"

// The pool can grow to this many titles, 50 at a time
export const POOL_CAP = 500
export const BATCH_SIZE = 50

export type MatchMode = "first" | "all"
export type NextStep = "keep-swiping" | "finish" | "offer-more"

export type SwipeRow = {
  userId: string
  movieId: string | number
  direction: string
}

export type MemberProgress = {
  userId: string
  swiped: number
  remaining: number
}

// The pool stores numbers and swipes.movie_id is varchar, so ids compare as
// strings
const key = (id: string | number) => String(id)

// Server actions take whatever the client sends, so check it at runtime.
// Anything unknown falls back to today's behaviour.
export function parseMatchMode(value: unknown): MatchMode {
  return value === "all" ? "all" : "first"
}

// Where to resume: the first pool id this person hasn't swiped. position is
// 1-based for the "12 / 50" counter and is total + 1 once every card is gone.
export function nextCard(
  poolIds: number[],
  swipedIds: Iterable<number | string>
): { index: number; position: number; total: number } {
  const swiped = new Set(Array.from(swipedIds, key))
  let index = -1
  let done = 0
  poolIds.forEach((id, i) => {
    if (swiped.has(key(id))) done++
    else if (index === -1) index = i
  })
  return { index, position: done + 1, total: poolIds.length }
}

// How far each member is through the pool. Swipes by non-members or on ids
// outside the pool don't count.
export function memberProgress(
  userIds: string[],
  poolIds: number[],
  swipes: SwipeRow[]
): MemberProgress[] {
  const pool = new Set(poolIds.map(key))
  const swipedBy = new Map<string, Set<string>>(
    userIds.map(id => [id, new Set<string>()])
  )
  for (const s of swipes) {
    const movieId = key(s.movieId)
    if (pool.has(movieId)) swipedBy.get(s.userId)?.add(movieId)
  }
  return userIds.map(userId => {
    const swiped = swipedBy.get(userId)?.size ?? 0
    return { userId, swiped, remaining: pool.size - swiped }
  })
}

// Every member has swiped every pool title, either way. An empty pool or an
// empty session is never done.
export function everyoneDone(
  userIds: string[],
  poolIds: number[],
  swipes: SwipeRow[]
): boolean {
  if (userIds.length === 0 || poolIds.length === 0) return false
  return memberProgress(userIds, poolIds, swipes).every(p => p.remaining === 0)
}

// Pool titles every member liked, in pool order, as strings (match_history
// stores varchar ids)
export function agreedTitles(
  userIds: string[],
  poolIds: number[],
  swipes: SwipeRow[]
): string[] {
  const byMovie = new Map<string, SwipeRow[]>()
  for (const s of swipes) {
    const movieId = key(s.movieId)
    byMovie.set(movieId, [...(byMovie.get(movieId) ?? []), s])
  }
  const seen = new Set<string>()
  const agreed: string[] = []
  for (const id of poolIds.map(key)) {
    if (seen.has(id)) continue
    seen.add(id)
    if (everyoneLiked(userIds, byMovie.get(id) ?? [])) agreed.push(id)
  }
  return agreed
}

// What happens once the swipes are in. Nobody agreeing offers more titles in
// either mode. First mode completes on its first match before anyone is done,
// so in practice "finish" is all mode's; the mode is taken so callers read
// the same in both.
export function nextStep(
  _mode: MatchMode,
  done: boolean,
  agreedCount: number
): NextStep {
  if (!done) return "keep-swiping"
  return agreedCount === 0 ? "offer-more" : "finish"
}

// "Add 50 more" is only open while swiping, once everyone is done, nothing was
// agreed, and the pool has room
export function canAddMore({
  status,
  done,
  agreedCount,
  poolLength,
  cap = POOL_CAP
}: {
  status: string
  done: boolean
  agreedCount: number
  poolLength: number
  cap?: number
}): boolean {
  return status === "started" && done && agreedCount === 0 && poolLength < cap
}

// Adds a batch after the existing pool, dropping repeats and stopping at the cap
export function appendBatch(
  pool: number[],
  batch: number[],
  cap = POOL_CAP
): { pool: number[]; added: number } {
  const seen = new Set(pool.map(key))
  const next = [...pool]
  for (const id of batch) {
    if (next.length >= cap) break
    if (seen.has(key(id))) continue
    seen.add(key(id))
    next.push(id)
  }
  return { pool: next, added: next.length - pool.length }
}

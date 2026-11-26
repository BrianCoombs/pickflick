export type SwipeDirection = "left" | "right"

// Server actions take whatever the client sends, so check it at runtime
export function parseSwipeDirection(value: unknown): SwipeDirection | null {
  return value === "left" || value === "right" ? value : null
}

export function isSessionMember(userIds: string[], userId: string): boolean {
  return userIds.includes(userId)
}

// Statuses: "active" is the lobby, "started" is swiping, "completed" has a
// match. Only "started" takes swipes, so a late swipe can't pick a second movie.
export function acceptsSwipes(status: string): boolean {
  return status === "started"
}

// Old sessions stored "super" swipes; they still count as likes
function isLike(direction: string): boolean {
  return direction === "right" || direction === "super"
}

// True when every current member has liked the movie
export function everyoneLiked(
  userIds: string[],
  swipes: { userId: string; direction: string }[]
): boolean {
  if (userIds.length === 0) return false
  const liked = new Set(
    swipes.filter(s => isLike(s.direction)).map(s => s.userId)
  )
  return userIds.every(id => liked.has(id))
}

const DEFAULT_RECENT_MATCHES = 8
const MAX_RECENT_MATCHES = 20

export function recentMatchesLimit(limit: number): number {
  if (Number.isNaN(limit)) return DEFAULT_RECENT_MATCHES
  return Math.min(MAX_RECENT_MATCHES, Math.max(1, Math.floor(limit)))
}

export type JoinDecision = "join" | "rejoin" | "closed"

// Members can always get back in (to the lobby, their next card, or the
// results). Newcomers can only join from the lobby, before the cards are dealt.
export function joinDecision(status: string, isMember: boolean): JoinDecision {
  const open = ["active", "started", "completed"].includes(status)
  if (!open) return "closed"
  if (isMember) return "rejoin"
  return status === "active" ? "join" : "closed"
}

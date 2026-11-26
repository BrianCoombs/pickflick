import { parseMediaType, type MediaType } from "../titles/title"
import {
  parseMatchMode,
  type MatchMode,
  type MemberProgress,
  type NextStep
} from "./progress"

// What GET /api/sessions/[sessionId]/participants returns. progress, done,
// nextStep and the agreed titles only mean something while swiping. Agreed
// titles are shown as they pile up in all mode ("Agreed so far"); first mode
// ends on its first agreement, so it never sends any.
export interface ParticipantsResponse {
  count: number
  status: string
  sessionStarted: boolean
  matchMode: MatchMode
  mediaType: MediaType
  poolVersion: number
  resetVersion: number
  poolSize: number
  progress: { userId: string; remaining: number }[]
  done: boolean
  nextStep: NextStep | null
  agreedIds: string[] // pool order; all mode only
  agreedCount: number
}

export function participantsResponse(
  session: {
    userIds: string[]
    status: string
    matchMode: unknown
    mediaType: unknown
    poolVersion: number
    resetVersion: number
    poolSize: number
  },
  settled: {
    progress: MemberProgress[]
    done: boolean
    step: NextStep
    agreed: string[]
  } | null
): ParticipantsResponse {
  const started = session.status === "started"
  const swiping = started && settled !== null
  const matchMode = parseMatchMode(session.matchMode)
  const agreedIds = swiping && matchMode === "all" ? [...settled.agreed] : []
  return {
    count: session.userIds.length,
    status: session.status,
    sessionStarted: started,
    matchMode,
    mediaType: parseMediaType(session.mediaType),
    poolVersion: session.poolVersion,
    resetVersion: session.resetVersion,
    poolSize: session.poolSize,
    progress: swiping
      ? settled.progress.map(({ userId, remaining }) => ({ userId, remaining }))
      : [],
    done: swiping ? settled.done : false,
    nextStep: swiping ? settled.step : null,
    agreedIds,
    agreedCount: agreedIds.length
  }
}

// The "host reset the session" notice. baseline is the reset_version the page
// loaded with (or the first one polled), so someone arriving after a reset
// sees nothing. The host made the change and doesn't need telling.
export function resetNoticeDue(
  baseline: number | null,
  latest: number,
  isHost: boolean
): boolean {
  return !isHost && baseline !== null && latest > baseline
}

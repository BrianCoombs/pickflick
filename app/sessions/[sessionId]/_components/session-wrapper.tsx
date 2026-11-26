"use client"

import type { WatchlistOption } from "@/actions/db/watchlist-actions"
import { useSessionParticipants } from "@/hooks/use-session-participants"
import type { SessionPreferences } from "@/lib/sessions/preferences"
import type { MatchMode } from "@/lib/sessions/progress"
import type { MediaType, Title } from "@/lib/titles/title"
import SwipeInterface from "./swipe-interface"

interface SessionWrapperProps {
  sessionId: string
  titles: Title[]
  mediaType: MediaType
  matchMode: MatchMode
  poolVersion: number
  resetVersion: number
  preferences: SessionPreferences
  poolSize: number
  swipedIds: string[]
  initialParticipantCount: number
  initialSessionStarted: boolean
  isHost: boolean
  people: WatchlistOption[]
}

// The client side of the session page: polls who's in, where everyone is up
// to and whether the host reset things, then hands it all to the screen
export default function SessionWrapper({
  initialParticipantCount,
  initialSessionStarted,
  ...props
}: SessionWrapperProps) {
  const {
    participantCount,
    sessionStarted,
    progress,
    nextStep,
    agreedIds,
    wasReset,
    acknowledgeReset,
    deleted,
    goToResults
  } = useSessionParticipants({
    sessionId: props.sessionId,
    initialCount: initialParticipantCount,
    initialStarted: initialSessionStarted,
    initialPoolVersion: props.poolVersion,
    initialResetVersion: props.resetVersion,
    isHost: props.isHost
  })

  return (
    <SwipeInterface
      {...props}
      participantCount={participantCount}
      sessionStarted={sessionStarted}
      progress={progress}
      nextStep={nextStep}
      agreedIds={agreedIds}
      wasReset={wasReset}
      acknowledgeReset={acknowledgeReset}
      deleted={deleted}
      goToResults={goToResults}
    />
  )
}

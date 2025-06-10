"use client"

import { useSessionParticipants } from "@/hooks/use-session-participants"
import SwipeInterface from "./swipe-interface"
import type { Movie } from "@/lib/api/tmdb"

interface SessionWrapperProps {
  sessionId: string
  movies: Movie[]
  initialParticipantCount: number
  initialSessionStarted: boolean
  isHost: boolean
  preferences?: any
}

export default function SessionWrapper({
  sessionId,
  movies,
  initialParticipantCount,
  initialSessionStarted,
  isHost,
  preferences
}: SessionWrapperProps) {
  const { participantCount, sessionStarted } = useSessionParticipants({
    sessionId,
    initialCount: initialParticipantCount,
    initialStarted: initialSessionStarted
  })

  return (
    <SwipeInterface
      sessionId={sessionId}
      movies={movies}
      participantCount={participantCount}
      sessionStarted={sessionStarted}
      isHost={isHost}
      preferences={preferences}
    />
  )
}

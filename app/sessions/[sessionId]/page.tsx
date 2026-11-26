import { notFound, redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import {
  getSessionWatchlistOptions,
  type WatchlistOption
} from "@/actions/db/watchlist-actions"
import { db } from "@/db/db"
import { movieSessions, swipes } from "@/db/schema"
import { getEnrichedTitle } from "@/lib/api/movie-service"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { normalizePreferences } from "@/lib/sessions/preferences"
import { parseMatchMode } from "@/lib/sessions/progress"
import { parsePool } from "@/lib/sessions/settle"
import { loadTitlesInOrder } from "@/lib/titles/placeholder"
import { parseMediaType } from "@/lib/titles/title"
import SessionWrapper from "./_components/session-wrapper"

interface SessionPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }
  const userId = user.id

  const { sessionId } = await params

  // Get session details
  const [session] = await db
    .select()
    .from(movieSessions)
    .where(eq(movieSessions.id, sessionId))
    .limit(1)

  if (!session) {
    notFound()
  }

  // Check if user is part of the session
  if (!session.userIds.includes(userId)) {
    redirect("/sessions")
  }

  // The session is over (a first-mode match, everyone finished in all mode,
  // or the host ended it): the results page has it
  if (session.status === "completed") {
    redirect(`/sessions/${sessionId}/match`)
  }

  // Get titles from stored pool
  if (!session.moviePool || !Array.isArray(session.moviePool)) {
    throw new Error("Session has no movie pool")
  }
  const pool = parsePool(session.moviePool)
  const mediaType = parseMediaType(session.mediaType)
  const sessionStarted = session.status === "started"

  // Details for every stored id, in order, from the 24-hour title cache (8
  // TMDb calls at a time on a miss). A title that still can't load becomes a
  // placeholder card rather than being dropped, so the deck matches the
  // server's pool and everyone can finish it. A failed people lookup
  // shouldn't take the page down either.
  const [titles, swipedRows, people] = await Promise.all([
    loadTitlesInOrder(mediaType, pool, getEnrichedTitle, 8),
    // Where this person is up to: the swipe card resumes from saved swipes
    sessionStarted
      ? db
          .select({ movieId: swipes.movieId })
          .from(swipes)
          .where(
            and(eq(swipes.sessionId, sessionId), eq(swipes.userId, userId))
          )
      : [],
    loadPeople(sessionId)
  ])

  return (
    <div className="flex flex-1 flex-col">
      <SessionWrapper
        sessionId={sessionId}
        titles={titles}
        mediaType={mediaType}
        matchMode={parseMatchMode(session.matchMode)}
        poolVersion={session.poolVersion}
        resetVersion={session.resetVersion}
        preferences={normalizePreferences(session.preferences, mediaType)}
        poolSize={pool.length}
        swipedIds={swipedRows.map(row => row.movieId)}
        initialParticipantCount={session.userIds.length}
        initialSessionStarted={sessionStarted}
        isHost={session.hostUserId === userId}
        people={people}
      />
    </div>
  )
}

async function loadPeople(sessionId: string): Promise<WatchlistOption[]> {
  try {
    const result = await getSessionWatchlistOptions(sessionId)
    return result.isSuccess ? result.data : []
  } catch (error) {
    console.error("Error loading session people:", error)
    return []
  }
}

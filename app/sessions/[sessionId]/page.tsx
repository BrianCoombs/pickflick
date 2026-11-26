import { notFound, redirect } from "next/navigation"
import { and, eq } from "drizzle-orm"
import {
  getSessionWatchlistOptions,
  type WatchlistOption
} from "@/actions/db/watchlist-actions"
import { db } from "@/db/db"
import { movieSessions, swipes } from "@/db/schema"
import { TMDbAPI } from "@/lib/api/tmdb"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { normalizePreferences } from "@/lib/sessions/preferences"
import { parseMatchMode } from "@/lib/sessions/progress"
import { parsePool } from "@/lib/sessions/settle"
import { parseMediaType, type Title } from "@/lib/titles/title"
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

  // Fetch details for the stored ids in order. A title TMDb can't load is
  // dropped, and a failed people lookup shouldn't take the page down.
  const tmdb = new TMDbAPI()
  const [titleResults, swipedRows, people] = await Promise.all([
    Promise.all(pool.map(id => tmdb.getTitle(mediaType, id).catch(() => null))),
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
  const titles = titleResults.filter((t): t is Title => t !== null)

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

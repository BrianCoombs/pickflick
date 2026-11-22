import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { db } from "@/db/db"
import { movieSessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import SessionWrapper from "./_components/session-wrapper"
import { TMDbAPI } from "@/lib/api/tmdb"
import { getSessionWatchlistOptions } from "@/actions/db/watchlist-actions"

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

  // Check if session has already matched
  if (session.status === "completed" && session.matchedMovieId) {
    redirect(`/sessions/${sessionId}/match`)
  }

  // Get movies from stored pool
  if (!session.moviePool || !Array.isArray(session.moviePool)) {
    throw new Error("Session has no movie pool")
  }

  // Fetch movie details for the stored IDs in order
  const tmdb = new TMDbAPI()
  const moviePromises = (session.moviePool as number[]).map(movieId =>
    tmdb.getMovie(movieId).catch(() => null)
  )
  const [movieResults, peopleResult] = await Promise.all([
    Promise.all(moviePromises),
    getSessionWatchlistOptions(sessionId)
  ])
  const movies = movieResults.filter(movie => movie !== null)

  return (
    <div className="flex flex-1 flex-col">
      <SessionWrapper
        sessionId={sessionId}
        movies={movies}
        initialParticipantCount={session.userIds.length}
        initialSessionStarted={session.status === "started"}
        isHost={session.hostUserId === userId}
        people={peopleResult.isSuccess ? peopleResult.data : []}
        preferences={session.preferences}
      />
    </div>
  )
}

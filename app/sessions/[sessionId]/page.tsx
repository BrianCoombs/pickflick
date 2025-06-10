import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { movieSessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import SwipeInterface from "./_components/swipe-interface"
import { MovieService } from "@/lib/api/movie-service"

interface SessionPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

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

  // Generate movie pool
  const movieService = new MovieService()
  const movies = await movieService.getMoviePool({
    userIds: session.userIds,
    poolSize: 50,
    filters: session.preferences as any
  })

  return (
    <div className="flex h-screen flex-col">
      <SwipeInterface
        sessionId={sessionId}
        movies={movies}
        participantCount={session.userIds.length}
      />
    </div>
  )
}

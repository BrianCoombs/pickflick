import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { db } from "@/db/db"
import { movieSessions } from "@/db/schema"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { participantsResponse } from "@/lib/sessions/poll"
import { parsePool } from "@/lib/sessions/settle"
import { settleSession } from "@/lib/sessions/settle-session"

// Polled every 3 seconds by useSessionParticipants. While swiping it also
// settles the session, so one whose finishing swipe request failed still
// completes here.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const userId = user.id

    const { sessionId } = await context.params

    const [session] = await db
      .select({
        userIds: movieSessions.userIds,
        status: movieSessions.status,
        matchMode: movieSessions.matchMode,
        mediaType: movieSessions.mediaType,
        poolVersion: movieSessions.poolVersion,
        resetVersion: movieSessions.resetVersion,
        moviePool: movieSessions.moviePool
      })
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 })
    }

    // Check if user is part of the session
    if (!session.userIds.includes(userId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const settled =
      session.status === "started" ? await settleSession(sessionId) : null

    return NextResponse.json(
      participantsResponse(
        {
          ...session,
          status: settled?.status ?? session.status,
          poolVersion: settled?.poolVersion ?? session.poolVersion,
          resetVersion: settled?.resetVersion ?? session.resetVersion,
          poolSize: settled?.poolSize ?? parsePool(session.moviePool).length
        },
        settled && {
          progress: settled.progress,
          done: settled.done,
          step: settled.nextStep,
          agreed: settled.agreedIds
        }
      )
    )
  } catch (error) {
    console.error("Error fetching participant count:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

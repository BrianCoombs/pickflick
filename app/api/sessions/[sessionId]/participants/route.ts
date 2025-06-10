import { NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { movieSessions } from "@/db/schema"
import { eq } from "drizzle-orm"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { sessionId } = await context.params

    const [session] = await db
      .select({
        userIds: movieSessions.userIds,
        status: movieSessions.status
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

    return NextResponse.json({
      count: session.userIds.length,
      status: session.status,
      sessionStarted: session.status === "started"
    })
  } catch (error) {
    console.error("Error fetching participant count:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

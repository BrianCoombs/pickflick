/*
<ai_context>
Server-only session bookkeeping shared by the swipe actions and the
participants poll. Deliberately not in a "use server" file: everything exported
there becomes a public endpoint, and these functions don't check who's asking.
</ai_context>
*/

import { and, eq } from "drizzle-orm"
import { db } from "@/db/db"
import { matchHistory, movieSessions, swipes } from "@/db/schema"
import { parseMatchMode, type MemberProgress, type NextStep } from "./progress"
import { parsePool, settleDecision, type Completion } from "./settle"

export interface SettleResult {
  status: string
  poolVersion: number
  resetVersion: number
  poolSize: number
  progress: MemberProgress[]
  done: boolean
  agreedIds: string[] // pool order
  agreedCount: number
  nextStep: NextStep
  matchedMovieId: string | null
}

// Completes a started session, once. The status and pool_version conditions
// let exactly one of several racing requests win (and none if the pool changed
// underneath them); only the winner writes match_history, inside the same
// transaction, with the unique (session, movie) index as a second guard.
export async function completeSession(
  sessionId: string,
  poolVersion: number,
  completion: Completion
): Promise<boolean> {
  return db.transaction(async tx => {
    const won = await tx
      .update(movieSessions)
      .set({ status: "completed", matchedMovieId: completion.matchedMovieId })
      .where(
        and(
          eq(movieSessions.id, sessionId),
          eq(movieSessions.status, "started"),
          eq(movieSessions.poolVersion, poolVersion)
        )
      )
      .returning({ id: movieSessions.id })

    if (won.length === 0) return false

    if (completion.movieIds.length > 0) {
      await tx
        .insert(matchHistory)
        .values(completion.movieIds.map(movieId => ({ sessionId, movieId })))
        .onConflictDoNothing()
    }
    return true
  })
}

// Works out where a session stands from its saved swipes, and completes it
// when it's finished (see settleDecision). Called after every swipe and by the
// participants poll, so a session whose finishing request failed still
// completes within one poll. Returns null when the session doesn't exist.
export async function settleSession(
  sessionId: string
): Promise<SettleResult | null> {
  const [session] = await db
    .select({
      status: movieSessions.status,
      userIds: movieSessions.userIds,
      moviePool: movieSessions.moviePool,
      matchMode: movieSessions.matchMode,
      poolVersion: movieSessions.poolVersion,
      resetVersion: movieSessions.resetVersion,
      matchedMovieId: movieSessions.matchedMovieId
    })
    .from(movieSessions)
    .where(eq(movieSessions.id, sessionId))
    .limit(1)

  if (!session) return null

  const pool = parsePool(session.moviePool)
  const rows = await db
    .select({
      userId: swipes.userId,
      movieId: swipes.movieId,
      direction: swipes.direction
    })
    .from(swipes)
    .where(eq(swipes.sessionId, sessionId))

  const decision = settleDecision({
    matchMode: parseMatchMode(session.matchMode),
    status: session.status,
    userIds: session.userIds,
    pool,
    swipes: rows
  })

  let { status, poolVersion, resetVersion, matchedMovieId } = session

  if (decision.completion) {
    const won = await completeSession(
      sessionId,
      session.poolVersion,
      decision.completion
    )
    if (won) {
      status = "completed"
      matchedMovieId = decision.completion.matchedMovieId
    } else {
      // Someone else completed it, or the pool changed: report what's there now
      const [latest] = await db
        .select({
          status: movieSessions.status,
          poolVersion: movieSessions.poolVersion,
          resetVersion: movieSessions.resetVersion,
          matchedMovieId: movieSessions.matchedMovieId
        })
        .from(movieSessions)
        .where(eq(movieSessions.id, sessionId))
        .limit(1)
      if (latest)
        ({ status, poolVersion, resetVersion, matchedMovieId } = latest)
    }
  }

  return {
    status,
    poolVersion,
    resetVersion,
    poolSize: pool.length,
    progress: decision.progress,
    done: decision.done,
    agreedIds: decision.agreed,
    agreedCount: decision.agreed.length,
    nextStep: decision.step,
    matchedMovieId
  }
}

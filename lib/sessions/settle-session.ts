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
import type { SwipeDirection } from "./rules"
import {
  parsePool,
  settleDecision,
  swipeGate,
  type Completion,
  type SwipeGate
} from "./settle"

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

export type RecordedSwipe =
  | { gate: "ok"; poolVersion: number; userIds: string[] }
  | { gate: Exclude<SwipeGate, "ok">; matchedMovieId: string | null }

// Saves a swipe, unless the session moved on since the caller validated it.
// The session row is locked FOR SHARE for the whole transaction, which
// conflicts with the row lock updateSessionSettings' UPDATE takes (held until
// its swipe DELETE commits). So either the reset commits first and this
// re-read sees the new reset_version and refuses, or this insert commits
// first and the reset's DELETE removes it. Swipes don't block each other.
export async function recordSwipe(swipe: {
  sessionId: string
  userId: string
  movieId: string
  direction: SwipeDirection
  resetVersion: number // as validated before the transaction
}): Promise<RecordedSwipe> {
  return db.transaction(async tx => {
    const [session] = await tx
      .select({
        status: movieSessions.status,
        userIds: movieSessions.userIds,
        moviePool: movieSessions.moviePool,
        poolVersion: movieSessions.poolVersion,
        resetVersion: movieSessions.resetVersion,
        matchedMovieId: movieSessions.matchedMovieId
      })
      .from(movieSessions)
      .where(eq(movieSessions.id, swipe.sessionId))
      .for("share")

    const gate = swipeGate(session, swipe)
    if (gate !== "ok") {
      return { gate, matchedMovieId: session?.matchedMovieId ?? null }
    }

    await tx
      .insert(swipes)
      .values({
        sessionId: swipe.sessionId,
        userId: swipe.userId,
        movieId: swipe.movieId,
        direction: swipe.direction
      })
      .onConflictDoUpdate({
        target: [swipes.sessionId, swipes.userId, swipes.movieId],
        set: { direction: swipe.direction, swipedAt: new Date() }
      })

    return {
      gate,
      poolVersion: session.poolVersion,
      userIds: session.userIds
    }
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

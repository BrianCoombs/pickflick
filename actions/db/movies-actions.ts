"use server"

import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db/db"
import { friendships, matchHistory, movieSessions, swipes } from "@/db/schema"
import { MovieService } from "@/lib/api/movie-service"
import { getAuthenticatedUser } from "@/lib/auth/server"
import {
  normalizePreferences,
  type SessionPreferences
} from "@/lib/sessions/preferences"
import {
  appendBatch,
  BATCH_SIZE,
  canAddMore,
  parseMatchMode,
  type MatchMode
} from "@/lib/sessions/progress"
import {
  acceptsSwipes,
  everyoneLiked,
  isSessionMember,
  joinDecision,
  parseSwipeDirection,
  recentMatchesLimit,
  type SwipeDirection
} from "@/lib/sessions/rules"
import {
  isInPool,
  isShortPool,
  parsePool,
  settingsChange,
  settleDecision
} from "@/lib/sessions/settle"
import { completeSession, settleSession } from "@/lib/sessions/settle-session"
import { allowedSourceTypes } from "@/lib/titles/sources"
import { parseMediaType, type MediaType } from "@/lib/titles/title"
import { buildPoolFromWatchlists } from "@/lib/watchlists/build"
import type { WatchlistSourceRef } from "@/lib/watchlists/combine"
import { getRequestOrigin } from "@/lib/watchlists/origin"
import { traktRedirectUri } from "@/lib/watchlists/redirect"
import { ActionState } from "@/types/server-action-types"

// Everything the host picks for a session: on the new-session page and in the
// Session settings dialog. Parsed again on the server (it's client input).
export interface SessionSettingsInput {
  mediaType: MediaType
  matchMode: MatchMode
  preferences: SessionPreferences
}

export interface PoolSummary {
  failed: WatchlistSourceRef[] // watchlists that didn't load
  poolSize: number
  short: boolean // fewer than one batch (50) matched
}

export type AddMoreResult =
  | { added: number; poolVersion: number }
  | { added: 0; reason: "exhausted" | "already-added" | "not-allowed" }

type PoolBuild =
  | { error: string }
  | {
      ids: number[]
      failed: WatchlistSourceRef[]
      exhausted: boolean
      preferences: SessionPreferences
    }

// Builds (or extends, with exclude) a pool from filters or watchlists. Only
// members' watchlists of a kind the media type allows are used, and the
// preferences returned are the ones to save.
async function buildPool({
  mediaType,
  preferences,
  memberIds,
  exclude = []
}: {
  mediaType: MediaType
  preferences: SessionPreferences
  memberIds: string[]
  exclude?: number[]
}): Promise<PoolBuild> {
  if (preferences.mode === "watchlists") {
    const allowed = allowedSourceTypes(mediaType)
    const sources = preferences.sources.filter(
      s => memberIds.includes(s.userId) && allowed.includes(s.sourceType)
    )
    if (sources.length === 0) {
      return { error: "Pick at least one watchlist" }
    }
    const origin = await getRequestOrigin()
    const pool = await buildPoolFromWatchlists(
      sources,
      traktRedirectUri(origin),
      { mediaType, exclude }
    )
    return {
      ids: pool.movieIds,
      failed: pool.failed,
      exhausted: pool.movieIds.length === 0,
      preferences: { mode: "watchlists", sources }
    }
  }

  const pool = await new MovieService().getTitlePool({
    mediaType,
    prefs: preferences,
    size: BATCH_SIZE,
    exclude
  })
  return { ids: pool.ids, failed: [], exhausted: pool.exhausted, preferences }
}

function emptyPoolMessage(build: Exclude<PoolBuild, { error: string }>) {
  if (build.preferences.mode === "watchlists") {
    return build.failed.length > 0
      ? "Couldn't load any of those watchlists. Try again, or pick others."
      : "Those watchlists are empty."
  }
  return "Nothing matches those filters. Try loosening them."
}

function parseSettings(settings: unknown) {
  const input = (settings ?? {}) as Partial<Record<string, unknown>>
  const mediaType = parseMediaType(input.mediaType)
  return {
    mediaType,
    matchMode: parseMatchMode(input.matchMode),
    preferences: normalizePreferences(input.preferences, mediaType)
  }
}

export async function createMovieSession(
  userIds: string[],
  settings: SessionSettingsInput
): Promise<ActionState<{ sessionId: string } & PoolSummary>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    // Ensure the host is included in the session
    const allUserIds = Array.from(new Set([userId, ...userIds]))
    const { mediaType, matchMode, preferences } = parseSettings(settings)

    const build = await buildPool({
      mediaType,
      preferences,
      memberIds: allUserIds
    })
    if ("error" in build) return { isSuccess: false, message: build.error }
    if (build.ids.length === 0) {
      return { isSuccess: false, message: emptyPoolMessage(build) }
    }

    const [session] = await db
      .insert(movieSessions)
      .values({
        hostUserId: userId,
        userIds: allUserIds,
        preferences: build.preferences,
        mediaType,
        matchMode,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
        moviePool: build.ids
      })
      .returning()

    revalidatePath("/sessions")
    return {
      isSuccess: true,
      message: "Session created successfully",
      data: {
        sessionId: session.id,
        failed: build.failed,
        poolSize: build.ids.length,
        short: isShortPool(build.ids.length)
      }
    }
  } catch (error) {
    console.error("Error creating movie session:", error)
    return { isSuccess: false, message: "Failed to create session" }
  }
}

export async function startMovieSession(
  sessionId: string
): Promise<ActionState<null>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    // Verify the user is the host
    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (session.hostUserId !== userId) {
      return {
        isSuccess: false,
        message: "Only the host can start the session"
      }
    }

    // Update session status to 'started'
    await db
      .update(movieSessions)
      .set({
        status: "started"
      })
      .where(eq(movieSessions.id, sessionId))

    return {
      isSuccess: true,
      message: "Session started successfully",
      data: null
    }
  } catch (error) {
    console.error("Error starting movie session:", error)
    return { isSuccess: false, message: "Failed to start session" }
  }
}

export async function joinMovieSession(
  sessionCode: string
): Promise<ActionState<{ session: any; sessionId: string }>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    // Handle both full UUID and short code (8 chars)
    let sessions
    if (sessionCode.length === 8) {
      // Short code - search for sessions starting with this code (case-insensitive)
      sessions = await db
        .select()
        .from(movieSessions)
        .where(
          sql`LOWER(${movieSessions.id}::text) LIKE LOWER(${sessionCode + "%"})`
        )
        .limit(1)
    } else {
      // Full UUID
      sessions = await db
        .select()
        .from(movieSessions)
        .where(eq(movieSessions.id, sessionCode))
        .limit(1)
    }

    const session = sessions[0]

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    const decision = joinDecision(
      session.status,
      isSessionMember(session.userIds, userId)
    )

    if (decision === "closed") {
      return { isSuccess: false, message: "Session is no longer active" }
    }

    if (decision === "join") {
      // Appended in SQL, and only while the lobby is open, so two people
      // joining at once both get in and nobody joins after the deal
      const joined = await db
        .update(movieSessions)
        .set({
          userIds: sql`array_append(${movieSessions.userIds}, ${userId})`
        })
        .where(
          and(
            eq(movieSessions.id, session.id),
            eq(movieSessions.status, "active"),
            sql`NOT (${userId} = ANY(${movieSessions.userIds}))`
          )
        )
        .returning({ id: movieSessions.id })

      if (joined.length === 0) {
        const [latest] = await db
          .select({ userIds: movieSessions.userIds })
          .from(movieSessions)
          .where(eq(movieSessions.id, session.id))
          .limit(1)
        if (!latest || !isSessionMember(latest.userIds, userId)) {
          return { isSuccess: false, message: "Session is no longer active" }
        }
      }
    }

    return {
      isSuccess: true,
      message:
        decision === "rejoin"
          ? "Back in the session"
          : "Joined session successfully",
      data: { session, sessionId: session.id }
    }
  } catch (error) {
    console.error("Error joining movie session:", error)
    return { isSuccess: false, message: "Failed to join session" }
  }
}

export async function swipeMovie(
  sessionId: string,
  movieId: string,
  direction: SwipeDirection
): Promise<ActionState<{ matched: boolean; movieId?: string; done: boolean }>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    const swipeDirection = parseSwipeDirection(direction)
    if (!swipeDirection) {
      return { isSuccess: false, message: "Invalid swipe" }
    }

    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (!isSessionMember(session.userIds, userId)) {
      return { isSuccess: false, message: "You are not part of this session" }
    }

    // The session is over (someone's swipe made the match, everyone finished
    // in all mode, or the host ended it): send this person to the results
    // instead of recording a swipe that could change them
    if (session.status === "completed") {
      return {
        isSuccess: true,
        message: "Already matched",
        data: {
          matched: true,
          movieId: session.matchedMovieId ?? undefined,
          done: true
        }
      }
    }

    if (!acceptsSwipes(session.status)) {
      return { isSuccess: false, message: "This session isn't taking swipes" }
    }

    // Swipes on anything else would throw off progress and agreement
    if (!isInPool(parsePool(session.moviePool), movieId)) {
      return { isSuccess: false, message: "That title isn't in this session" }
    }
    const swipedId = String(movieId)

    // Insert swipe
    await db
      .insert(swipes)
      .values({
        sessionId,
        userId,
        movieId: swipedId,
        direction: swipeDirection
      })
      .onConflictDoUpdate({
        target: [swipes.sessionId, swipes.userId, swipes.movieId],
        set: {
          direction: swipeDirection,
          swipedAt: new Date()
        }
      })

    // First mode: the first title everyone likes ends the session, as before.
    // All mode never matches early; settleSession completes it once everyone
    // has swiped the whole pool.
    if (parseMatchMode(session.matchMode) === "first") {
      if (
        swipeDirection === "right" &&
        (await checkForMatch(session, swipedId))
      ) {
        return {
          isSuccess: true,
          message: "Match found!",
          data: { matched: true, movieId: swipedId, done: false }
        }
      }
    }

    const settled = await settleSession(sessionId)
    const matched = settled?.status === "completed"

    return {
      isSuccess: true,
      message: matched ? "Session complete" : "Swipe recorded",
      data: {
        matched,
        movieId: matched ? (settled?.matchedMovieId ?? undefined) : undefined,
        done: settled?.done ?? false
      }
    }
  } catch (error) {
    console.error("Error swiping movie:", error)
    return { isSuccess: false, message: "Failed to record swipe" }
  }
}

async function checkForMatch(
  session: { id: string; userIds: string[] },
  movieId: string
): Promise<boolean> {
  // Get all swipes for this movie in this session
  const movieSwipes = await db
    .select({ userId: swipes.userId, direction: swipes.direction })
    .from(swipes)
    .where(and(eq(swipes.sessionId, session.id), eq(swipes.movieId, movieId)))

  if (!everyoneLiked(session.userIds, movieSwipes)) return false

  // Only the first match counts. The status condition makes this atomic:
  // if two last swipes land together, Postgres lets one update win and the
  // other sees status "completed" and updates nothing.
  const won = await db
    .update(movieSessions)
    .set({
      matchedMovieId: movieId,
      status: "completed"
    })
    .where(
      and(eq(movieSessions.id, session.id), eq(movieSessions.status, "started"))
    )
    .returning({ id: movieSessions.id })

  if (won.length > 0) {
    await db.insert(matchHistory).values({
      sessionId: session.id,
      movieId
    })
  }

  // Either way the session has a match now, so this swiper goes to it
  return true
}

export async function getFriends(): Promise<ActionState<any>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    const friends = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(eq(friendships.userId1, userId), eq(friendships.userId2, userId)),
          eq(friendships.status, "accepted")
        )
      )

    return { isSuccess: true, message: "Friends retrieved", data: friends }
  } catch (error) {
    console.error("Error getting friends:", error)
    return { isSuccess: false, message: "Failed to get friends" }
  }
}

export async function sendFriendRequest(
  targetUserId: string
): Promise<ActionState<any>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    // Ensure user1 < user2 for consistency
    const [user1, user2] = [userId, targetUserId].sort()

    const [friendship] = await db
      .insert(friendships)
      .values({
        userId1: user1,
        userId2: user2,
        status: "pending"
      })
      .onConflictDoNothing()
      .returning()

    return { isSuccess: true, message: "Friend request sent", data: friendship }
  } catch (error) {
    console.error("Error sending friend request:", error)
    return { isSuccess: false, message: "Failed to send friend request" }
  }
}

export async function acceptFriendRequest(
  friendshipId: string
): Promise<ActionState<any>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    const [friendship] = await db
      .update(friendships)
      .set({
        status: "accepted",
        acceptedAt: new Date()
      })
      .where(
        and(
          eq(friendships.id, friendshipId),
          or(eq(friendships.userId1, userId), eq(friendships.userId2, userId))
        )
      )
      .returning()

    return {
      isSuccess: true,
      message: "Friend request accepted",
      data: friendship
    }
  } catch (error) {
    console.error("Error accepting friend request:", error)
    return { isSuccess: false, message: "Failed to accept friend request" }
  }
}

export async function getActiveSessions(): Promise<ActionState<any>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    const sessions = await db
      .select()
      .from(movieSessions)
      .where(
        and(
          eq(movieSessions.status, "active"),
          sql`${userId} = ANY(${movieSessions.userIds})`
        )
      )
      .orderBy(desc(movieSessions.createdAt))

    return { isSuccess: true, message: "Sessions retrieved", data: sessions }
  } catch (error) {
    console.error("Error getting active sessions:", error)
    return { isSuccess: false, message: "Failed to get sessions" }
  }
}

export async function getSessionHistory(): Promise<ActionState<any>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    const sessions = await db
      .select()
      .from(movieSessions)
      .where(
        and(
          eq(movieSessions.status, "completed"),
          sql`${userId} = ANY(${movieSessions.userIds})`
        )
      )
      .orderBy(desc(movieSessions.createdAt))
      .limit(20)

    return { isSuccess: true, message: "Sessions retrieved", data: sessions }
  } catch (error) {
    console.error("Error getting session history:", error)
    return { isSuccess: false, message: "Failed to get history" }
  }
}

// Host only, in the lobby or mid-session. Rebuilds the pool from the new
// settings; mid-session it also wipes everyone's swipes and bumps
// reset_version so the others get a "the host reset the session" notice. The
// pool_version condition makes a racing "Add more" (or a second save) fail
// cleanly instead of both landing.
export async function updateSessionSettings(
  sessionId: string,
  settings: SessionSettingsInput
): Promise<ActionState<PoolSummary & { reset: boolean }>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (session.hostUserId !== user.id) {
      return {
        isSuccess: false,
        message: "Only the host can change the settings"
      }
    }

    if (!settingsChange(session.status).allowed) {
      return { isSuccess: false, message: "This session is already over" }
    }

    const { mediaType, matchMode, preferences } = parseSettings(settings)
    const build = await buildPool({
      mediaType,
      preferences,
      memberIds: session.userIds
    })
    if ("error" in build) return { isSuccess: false, message: build.error }
    if (build.ids.length === 0) {
      return { isSuccess: false, message: emptyPoolMessage(build) }
    }

    const updated = await db.transaction(async tx => {
      const [row] = await tx
        .update(movieSessions)
        .set({
          preferences: build.preferences,
          mediaType,
          matchMode,
          moviePool: build.ids,
          poolVersion: sql`${movieSessions.poolVersion} + 1`,
          resetVersion: sql`CASE WHEN ${movieSessions.status} = 'started' THEN ${movieSessions.resetVersion} + 1 ELSE ${movieSessions.resetVersion} END`
        })
        .where(
          and(
            eq(movieSessions.id, sessionId),
            eq(movieSessions.poolVersion, session.poolVersion),
            inArray(movieSessions.status, ["active", "started"])
          )
        )
        .returning({ status: movieSessions.status })

      if (!row) return null

      // The old swipes were for the old pool
      await tx.delete(swipes).where(eq(swipes.sessionId, sessionId))
      return row
    })

    if (!updated) {
      return {
        isSuccess: false,
        message: "The session changed while you were saving. Try again."
      }
    }

    revalidatePath(`/sessions/${sessionId}`)
    return {
      isSuccess: true,
      message: "Settings saved",
      data: {
        failed: build.failed,
        poolSize: build.ids.length,
        short: isShortPool(build.ids.length),
        reset: settingsChange(updated.status).reset
      }
    }
  } catch (error) {
    console.error("Error updating session settings:", error)
    return { isSuccess: false, message: "Failed to save settings" }
  }
}

/**
 * @deprecated Use updateSessionSettings. Kept for criteria-dialog.tsx until
 * the shared settings form replaces it; keeps the session's media type and
 * match mode.
 */
export async function updateSessionPreferences(
  sessionId: string,
  preferences: unknown
): Promise<ActionState<PoolSummary & { reset: boolean }>> {
  try {
    const [session] = await db
      .select({
        mediaType: movieSessions.mediaType,
        matchMode: movieSessions.matchMode
      })
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    const mediaType = parseMediaType(session.mediaType)
    return updateSessionSettings(sessionId, {
      mediaType,
      matchMode: parseMatchMode(session.matchMode),
      preferences: normalizePreferences(preferences, mediaType)
    })
  } catch (error) {
    console.error("Error updating session preferences:", error)
    return { isSuccess: false, message: "Failed to update preferences" }
  }
}

// "Add 50 more": everyone finished the pool and nobody agreed. Any member can
// press it; the pool_version condition lets only one press count.
export async function addMoreMovies(
  sessionId: string
): Promise<ActionState<AddMoreResult>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (!isSessionMember(session.userIds, user.id)) {
      return { isSuccess: false, message: "You are not part of this session" }
    }

    const settled = await settleSession(sessionId)
    if (!settled) {
      return { isSuccess: false, message: "Session not found" }
    }

    // The pool already changed since we read it: someone else added more
    if (settled.poolVersion !== session.poolVersion) {
      return {
        isSuccess: true,
        message: "Already added",
        data: { added: 0, reason: "already-added" }
      }
    }

    const pool = parsePool(session.moviePool)
    if (
      !canAddMore({
        status: settled.status,
        done: settled.done,
        agreedCount: settled.agreedCount,
        poolLength: pool.length
      })
    ) {
      return {
        isSuccess: true,
        message: "Can't add more now",
        data: { added: 0, reason: "not-allowed" }
      }
    }

    const mediaType = parseMediaType(session.mediaType)
    const build = await buildPool({
      mediaType,
      preferences: normalizePreferences(session.preferences, mediaType),
      memberIds: session.userIds,
      exclude: pool
    })
    const next =
      "error" in build ? { pool, added: 0 } : appendBatch(pool, build.ids)

    if (next.added === 0) {
      return {
        isSuccess: true,
        message: "No more titles match",
        data: { added: 0, reason: "exhausted" }
      }
    }

    const won = await db
      .update(movieSessions)
      .set({
        moviePool: next.pool,
        poolVersion: session.poolVersion + 1
      })
      .where(
        and(
          eq(movieSessions.id, sessionId),
          eq(movieSessions.status, "started"),
          eq(movieSessions.poolVersion, session.poolVersion)
        )
      )
      .returning({ poolVersion: movieSessions.poolVersion })

    if (won.length === 0) {
      return {
        isSuccess: true,
        message: "Already added",
        data: { added: 0, reason: "already-added" }
      }
    }

    revalidatePath(`/sessions/${sessionId}`)
    return {
      isSuccess: true,
      message: `Added ${next.added}`,
      data: { added: next.added, poolVersion: won[0].poolVersion }
    }
  } catch (error) {
    console.error("Error adding more titles:", error)
    return { isSuccess: false, message: "Failed to add more titles" }
  }
}

// All mode, host only: end now with whatever everyone has agreed on so far
// (possibly nothing), for when someone wanders off before finishing
export async function endSessionNow(
  sessionId: string
): Promise<ActionState<null>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (session.hostUserId !== user.id) {
      return { isSuccess: false, message: "Only the host can end the session" }
    }

    if (parseMatchMode(session.matchMode) !== "all") {
      return {
        isSuccess: false,
        message: "Only sessions that collect every match can end early"
      }
    }

    if (session.status !== "started") {
      return { isSuccess: false, message: "This session isn't swiping" }
    }

    const rows = await db
      .select({
        userId: swipes.userId,
        movieId: swipes.movieId,
        direction: swipes.direction
      })
      .from(swipes)
      .where(eq(swipes.sessionId, sessionId))

    const { agreed } = settleDecision({
      matchMode: "all",
      status: session.status,
      userIds: session.userIds,
      pool: parsePool(session.moviePool),
      swipes: rows
    })

    const won = await completeSession(sessionId, session.poolVersion, {
      matchedMovieId: null,
      movieIds: agreed
    })

    if (!won) {
      // Fine if it finished on its own meanwhile; otherwise the pool changed
      const [latest] = await db
        .select({ status: movieSessions.status })
        .from(movieSessions)
        .where(eq(movieSessions.id, sessionId))
        .limit(1)
      if (latest?.status !== "completed") {
        return {
          isSuccess: false,
          message: "The session changed. Try again."
        }
      }
    }

    revalidatePath(`/sessions/${sessionId}`)
    return { isSuccess: true, message: "Session ended", data: null }
  } catch (error) {
    console.error("Error ending session:", error)
    return { isSuccess: false, message: "Failed to end the session" }
  }
}

export async function deleteMovieSession(
  sessionId: string
): Promise<ActionState<any>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    // Get session to verify user is the host
    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (session.hostUserId !== userId) {
      return {
        isSuccess: false,
        message: "Only the host can delete the session"
      }
    }

    // Delete all swipes for this session
    await db.delete(swipes).where(eq(swipes.sessionId, sessionId))

    // Delete any match history
    await db.delete(matchHistory).where(eq(matchHistory.sessionId, sessionId))

    // Delete the session
    await db.delete(movieSessions).where(eq(movieSessions.id, sessionId))

    revalidatePath("/sessions")
    return {
      isSuccess: true,
      message: "Session deleted successfully",
      data: null
    }
  } catch (error) {
    console.error("Error deleting session:", error)
    return { isSuccess: false, message: "Failed to delete session" }
  }
}

// The user's last few matches, newest first, for the shelf on /sessions. An
// all-mode session has one row per agreed title, so key by sessionId+movieId.
export async function getRecentMatches(limit = 8): Promise<
  ActionState<
    {
      sessionId: string
      movieId: string
      title: string
      mediaType: MediaType
    }[]
  >
> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Newest match first, by when the match happened
    const rows = await db
      .select({
        id: movieSessions.id,
        mediaType: movieSessions.mediaType,
        matchedMovieId: matchHistory.movieId
      })
      .from(matchHistory)
      .innerJoin(movieSessions, eq(matchHistory.sessionId, movieSessions.id))
      .where(sql`${user.id} = ANY(${movieSessions.userIds})`)
      .orderBy(desc(matchHistory.matchedAt))
      .limit(recentMatchesLimit(limit))

    const movieService = new MovieService()
    const matches = await Promise.all(
      rows.map(async row => {
        const mediaType = parseMediaType(row.mediaType)
        try {
          const title = await movieService.getEnrichedTitle(
            mediaType,
            Number(row.matchedMovieId)
          )
          return {
            sessionId: row.id,
            movieId: row.matchedMovieId,
            title: title.name,
            mediaType
          }
        } catch {
          return null
        }
      })
    )

    return {
      isSuccess: true,
      message: "Matches retrieved",
      data: matches.filter(m => m !== null)
    }
  } catch (error) {
    console.error("Error getting recent matches:", error)
    return { isSuccess: false, message: "Failed to get matches" }
  }
}

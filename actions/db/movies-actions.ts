"use server"

import { and, desc, eq, inArray, or, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db/db"
import { friendships, matchHistory, movieSessions, swipes } from "@/db/schema"
import { getEnrichedTitle, getTitlePool } from "@/lib/api/movie-service"
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
  everyoneLiked,
  isSessionMember,
  joinDecision,
  parseSwipeDirection,
  recentMatchesLimit,
  type SwipeDirection
} from "@/lib/sessions/rules"
import {
  emptyBatchReason,
  firstMatchResult,
  isShortPool,
  parsePool,
  settingsChange,
  settleDecision,
  swipeGate,
  type SwipeGate
} from "@/lib/sessions/settle"
import {
  completeSession,
  recordSwipe,
  settleSession
} from "@/lib/sessions/settle-session"
import { allowedSourceTypes } from "@/lib/titles/sources"
import { parseMediaType, type MediaType } from "@/lib/titles/title"
import { buildPoolFromWatchlists } from "@/lib/watchlists/build"
import type { WatchlistSourceRef } from "@/lib/watchlists/combine"
import { letterboxdEnabled } from "@/lib/watchlists/letterboxd"
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
  | {
      added: 0
      // exhausted: nothing new matches. failed: a watchlist or TMDb fetch
      // failed, so trying again may work
      reason: "exhausted" | "failed" | "already-added" | "not-allowed"
    }

export interface ActiveSessionSummary {
  id: string
  status: "active" | "started" // lobby, or swiping
  userIds: string[]
  mediaType: MediaType
  matchMode: MatchMode
  createdAt: Date
}

type PoolBuild =
  | { error: string }
  | {
      ids: number[]
      failed: WatchlistSourceRef[]
      exhausted: boolean
      preferences: SessionPreferences
    }

// Builds (or extends, with exclude) a pool from filters or watchlists. Only
// members' watchlists of a kind the media type allows are used (no Letterboxd
// when LETTERBOXD_ENABLED=false), and the preferences returned are the ones
// to save.
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
    const allowed = allowedSourceTypes(mediaType, {
      letterboxd: letterboxdEnabled()
    })
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

  const pool = await getTitlePool({
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

// The host is the only member to start with; everyone else joins by code
export async function createMovieSession(
  settings: SessionSettingsInput
): Promise<ActionState<{ sessionId: string } & PoolSummary>> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id
    const { mediaType, matchMode, preferences } = parseSettings(settings)

    const build = await buildPool({
      mediaType,
      preferences,
      memberIds: [userId]
    })
    if ("error" in build) return { isSuccess: false, message: build.error }
    if (build.ids.length === 0) {
      return { isSuccess: false, message: emptyPoolMessage(build) }
    }

    const [session] = await db
      .insert(movieSessions)
      .values({
        hostUserId: userId,
        userIds: [userId],
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

    // Only the lobby can be dealt: never reopen a finished session or
    // restart one that's already swiping
    const started = await db
      .update(movieSessions)
      .set({ status: "started" })
      .where(
        and(eq(movieSessions.id, sessionId), eq(movieSessions.status, "active"))
      )
      .returning({ id: movieSessions.id })

    if (started.length === 0) {
      return {
        isSuccess: false,
        message:
          session.status === "started"
            ? "This session has already started"
            : "This session is no longer in the lobby"
      }
    }

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

type SwipeResult = { matched: boolean; movieId?: string; done: boolean }

// What the swiper hears when swipeGate turns the swipe away
function refusedSwipe(
  gate: Exclude<SwipeGate, "ok">,
  matchedMovieId: string | null
): ActionState<SwipeResult> {
  switch (gate) {
    case "missing":
      return { isSuccess: false, message: "Session not found" }
    case "not-member":
      return { isSuccess: false, message: "You are not part of this session" }
    case "completed":
      // The session is over (someone's swipe made the match, everyone
      // finished in all mode, or the host ended it): send this person to the
      // results instead of recording a swipe that could change them
      return {
        isSuccess: true,
        message: "Already matched",
        data: {
          matched: true,
          movieId: matchedMovieId ?? undefined,
          done: true
        }
      }
    case "closed":
      return { isSuccess: false, message: "This session isn't taking swipes" }
    case "reset":
      return {
        isSuccess: false,
        message: "The host reset the session. Start swiping again."
      }
    case "not-in-pool":
      // Swipes on anything else would throw off progress and agreement
      return { isSuccess: false, message: "That title isn't in this session" }
  }
}

export async function swipeMovie(
  sessionId: string,
  movieId: string,
  direction: SwipeDirection
): Promise<ActionState<SwipeResult>> {
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

    const swipedId = String(movieId)
    const validated = {
      userId,
      movieId: swipedId,
      resetVersion: session?.resetVersion ?? 0
    }
    const gate = swipeGate(session, validated)
    if (gate !== "ok") {
      return refusedSwipe(gate, session?.matchedMovieId ?? null)
    }

    // Saved with the session row locked, after checking again that no host
    // reset landed since the read above (see recordSwipe)
    const recorded = await recordSwipe({
      sessionId,
      direction: swipeDirection,
      ...validated
    })
    if (recorded.gate !== "ok") {
      return refusedSwipe(recorded.gate, recorded.matchedMovieId)
    }

    // First mode: the first title everyone likes ends the session, as before.
    // All mode never matches early; settleSession completes it once everyone
    // has swiped the whole pool.
    if (
      parseMatchMode(session.matchMode) === "first" &&
      swipeDirection === "right"
    ) {
      const match = await checkForMatch(
        {
          id: sessionId,
          userIds: recorded.userIds,
          poolVersion: recorded.poolVersion
        },
        swipedId
      )
      if (match.matched) {
        return {
          isSuccess: true,
          message: "Match found!",
          data: { matched: true, movieId: match.movieId, done: false }
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

// First mode: if everyone now likes movieId, complete the session with it.
// completeSession's status and pool_version conditions mean a match can't
// complete a session that was reset (or already completed) meanwhile.
async function checkForMatch(
  session: { id: string; userIds: string[]; poolVersion: number },
  movieId: string
): Promise<ReturnType<typeof firstMatchResult>> {
  const movieSwipes = await db
    .select({ userId: swipes.userId, direction: swipes.direction })
    .from(swipes)
    .where(and(eq(swipes.sessionId, session.id), eq(swipes.movieId, movieId)))

  if (!everyoneLiked(session.userIds, movieSwipes)) return { matched: false }

  const won = await completeSession(session.id, session.poolVersion, {
    matchedMovieId: movieId,
    movieIds: [movieId]
  })

  const latest = won
    ? undefined
    : (
        await db
          .select({
            status: movieSessions.status,
            matchedMovieId: movieSessions.matchedMovieId
          })
          .from(movieSessions)
          .where(eq(movieSessions.id, session.id))
          .limit(1)
      )[0]

  return firstMatchResult(movieId, won, latest)
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

// Sessions the user can get back into from /sessions: lobbies and ones that
// are mid-swipe, newest first
export async function getActiveSessions(): Promise<
  ActionState<ActiveSessionSummary[]>
> {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return { isSuccess: false, message: "Unauthorized" }
    }
    const userId = user.id

    const rows = await db
      .select({
        id: movieSessions.id,
        status: movieSessions.status,
        userIds: movieSessions.userIds,
        mediaType: movieSessions.mediaType,
        matchMode: movieSessions.matchMode,
        createdAt: movieSessions.createdAt
      })
      .from(movieSessions)
      .where(
        and(
          inArray(movieSessions.status, ["active", "started"]),
          sql`${userId} = ANY(${movieSessions.userIds})`
        )
      )
      .orderBy(desc(movieSessions.createdAt))

    const sessions: ActiveSessionSummary[] = rows.map(row => ({
      ...row,
      status: row.status === "started" ? "started" : "active",
      mediaType: parseMediaType(row.mediaType),
      matchMode: parseMatchMode(row.matchMode)
    }))

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
// cleanly instead of both landing. The UPDATE comes first in the transaction,
// so the session row stays locked through the swipe DELETE: a swipe being
// saved (recordSwipe holds the row FOR SHARE) either commits before the UPDATE
// can run, and is deleted, or waits and then sees the new reset_version.
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
    // A thrown build (TMDb down) or a watchlist that didn't load is a failure
    // worth retrying, not the end of the titles
    let build: PoolBuild | null = null
    try {
      build = await buildPool({
        mediaType,
        preferences: normalizePreferences(session.preferences, mediaType),
        memberIds: session.userIds,
        exclude: pool
      })
    } catch (error) {
      console.error("Error building more titles:", error)
    }
    const next =
      build && !("error" in build)
        ? appendBatch(pool, build.ids)
        : { pool, added: 0 }

    if (next.added === 0) {
      const reason = emptyBatchReason({
        threw: build === null,
        failedSources: build && !("error" in build) ? build.failed.length : 0
      })
      return {
        isSuccess: true,
        message:
          reason === "failed"
            ? "Couldn't load more titles. Try again."
            : "No more titles match",
        data: { added: 0, reason }
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

    const matches = await Promise.all(
      rows.map(async row => {
        const mediaType = parseMediaType(row.mediaType)
        try {
          const title = await getEnrichedTitle(
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

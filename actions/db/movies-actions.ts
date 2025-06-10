"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { movieSessions, swipes, friendships, matchHistory } from "@/db/schema"
import { and, eq, or, desc, sql } from "drizzle-orm"
import { ActionResponse } from "@/types/server-action-types"
import { revalidatePath } from "next/cache"

export async function createMovieSession(
  userIds: string[],
  preferences?: any
): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Ensure the host is included in the session
    const allUserIds = Array.from(new Set([userId, ...userIds]))

    const [session] = await db
      .insert(movieSessions)
      .values({
        hostUserId: userId,
        userIds: allUserIds,
        preferences: preferences || {},
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
      })
      .returning()

    revalidatePath("/sessions")
    return { success: true, data: session }
  } catch (error) {
    console.error("Error creating movie session:", error)
    return { success: false, message: "Failed to create session" }
  }
}

export async function joinMovieSession(
  sessionId: string
): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Get the session
    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { success: false, message: "Session not found" }
    }

    if (session.status !== "active") {
      return { success: false, message: "Session is no longer active" }
    }

    // Add user to session if not already in it
    if (!session.userIds.includes(userId)) {
      await db
        .update(movieSessions)
        .set({
          userIds: [...session.userIds, userId],
        })
        .where(eq(movieSessions.id, sessionId))
    }

    return { success: true, data: session }
  } catch (error) {
    console.error("Error joining movie session:", error)
    return { success: false, message: "Failed to join session" }
  }
}

export async function swipeMovie(
  sessionId: string,
  movieId: string,
  direction: "left" | "right" | "super"
): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Insert swipe
    await db
      .insert(swipes)
      .values({
        sessionId,
        userId,
        movieId,
        direction,
      })
      .onConflictDoUpdate({
        target: [swipes.sessionId, swipes.userId, swipes.movieId],
        set: {
          direction,
          swipedAt: new Date(),
        },
      })

    // Check for match if swiped right
    if (direction === "right" || direction === "super") {
      const match = await checkForMatch(sessionId, movieId)
      if (match) {
        return { success: true, data: { matched: true, movieId } }
      }
    }

    return { success: true, data: { matched: false } }
  } catch (error) {
    console.error("Error swiping movie:", error)
    return { success: false, message: "Failed to record swipe" }
  }
}

async function checkForMatch(sessionId: string, movieId: string): Promise<boolean> {
  // Get session details
  const [session] = await db
    .select()
    .from(movieSessions)
    .where(eq(movieSessions.id, sessionId))
    .limit(1)

  if (!session) return false

  // Get all swipes for this movie in this session
  const movieSwipes = await db
    .select()
    .from(swipes)
    .where(
      and(
        eq(swipes.sessionId, sessionId),
        eq(swipes.movieId, movieId),
        or(eq(swipes.direction, "right"), eq(swipes.direction, "super"))
      )
    )

  // Check if all users have swiped right
  if (movieSwipes.length === session.userIds.length) {
    // Update session with matched movie
    await db
      .update(movieSessions)
      .set({
        matchedMovieId: movieId,
        status: "completed",
      })
      .where(eq(movieSessions.id, sessionId))

    // Record match in history
    await db.insert(matchHistory).values({
      sessionId,
      movieId,
    })

    return true
  }

  return false
}

export async function getFriends(): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

    const friends = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.userId1, userId),
            eq(friendships.userId2, userId)
          ),
          eq(friendships.status, "accepted")
        )
      )

    return { success: true, data: friends }
  } catch (error) {
    console.error("Error getting friends:", error)
    return { success: false, message: "Failed to get friends" }
  }
}

export async function sendFriendRequest(
  targetUserId: string
): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

    // Ensure user1 < user2 for consistency
    const [user1, user2] = [userId, targetUserId].sort()

    const [friendship] = await db
      .insert(friendships)
      .values({
        userId1: user1,
        userId2: user2,
        status: "pending",
      })
      .onConflictDoNothing()
      .returning()

    return { success: true, data: friendship }
  } catch (error) {
    console.error("Error sending friend request:", error)
    return { success: false, message: "Failed to send friend request" }
  }
}

export async function acceptFriendRequest(
  friendshipId: string
): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

    const [friendship] = await db
      .update(friendships)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(
        and(
          eq(friendships.id, friendshipId),
          or(
            eq(friendships.userId1, userId),
            eq(friendships.userId2, userId)
          )
        )
      )
      .returning()

    return { success: true, data: friendship }
  } catch (error) {
    console.error("Error accepting friend request:", error)
    return { success: false, message: "Failed to accept friend request" }
  }
}

export async function getActiveSessions(): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

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

    return { success: true, data: sessions }
  } catch (error) {
    console.error("Error getting active sessions:", error)
    return { success: false, message: "Failed to get sessions" }
  }
}

export async function getSessionHistory(): Promise<ActionResponse> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { success: false, message: "Unauthorized" }
    }

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

    return { success: true, data: sessions }
  } catch (error) {
    console.error("Error getting session history:", error)
    return { success: false, message: "Failed to get history" }
  }
}
"use server"

import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { movieSessions, swipes, friendships, matchHistory } from "@/db/schema"
import { and, eq, or, desc, sql } from "drizzle-orm"
import { ActionState } from "@/types/server-action-types"
import { revalidatePath } from "next/cache"

export async function createMovieSession(
  userIds: string[],
  preferences?: any
): Promise<ActionState<{ sessionId: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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
    return { isSuccess: true, message: "Session created successfully", data: { sessionId: session.id } }
  } catch (error) {
    console.error("Error creating movie session:", error)
    return { isSuccess: false, message: "Failed to create session" }
  }
}

export async function joinMovieSession(
  sessionId: string
): Promise<ActionState<{ session: any }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get the session
    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (session.status !== "active") {
      return { isSuccess: false, message: "Session is no longer active" }
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

    return { isSuccess: true, message: "Joined session successfully", data: { session } }
  } catch (error) {
    console.error("Error joining movie session:", error)
    return { isSuccess: false, message: "Failed to join session" }
  }
}

export async function swipeMovie(
  sessionId: string,
  movieId: string,
  direction: "left" | "right" | "super"
): Promise<ActionState<{ matched: boolean; movieId?: string }>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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
        return { isSuccess: true, message: "Match found!", data: { matched: true, movieId } }
      }
    }

    return { isSuccess: true, message: "Swipe recorded", data: { matched: false } }
  } catch (error) {
    console.error("Error swiping movie:", error)
    return { isSuccess: false, message: "Failed to record swipe" }
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

export async function getFriends(): Promise<ActionState<any>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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

    return { isSuccess: true, message: "Friend request accepted", data: friendship }
  } catch (error) {
    console.error("Error accepting friend request:", error)
    return { isSuccess: false, message: "Failed to accept friend request" }
  }
}

export async function getActiveSessions(): Promise<ActionState<any>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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

    return { isSuccess: true, message: "Sessions retrieved", data: sessions }
  } catch (error) {
    console.error("Error getting active sessions:", error)
    return { isSuccess: false, message: "Failed to get sessions" }
  }
}

export async function getSessionHistory(): Promise<ActionState<any>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
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

    return { isSuccess: true, message: "Sessions retrieved", data: sessions }
  } catch (error) {
    console.error("Error getting session history:", error)
    return { isSuccess: false, message: "Failed to get history" }
  }
}

export async function updateSessionPreferences(
  sessionId: string,
  preferences: any
): Promise<ActionState<any>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

    // Get session to verify user is part of it
    const [session] = await db
      .select()
      .from(movieSessions)
      .where(eq(movieSessions.id, sessionId))
      .limit(1)

    if (!session) {
      return { isSuccess: false, message: "Session not found" }
    }

    if (!session.userIds.includes(userId)) {
      return { isSuccess: false, message: "You are not part of this session" }
    }

    // Update preferences
    await db
      .update(movieSessions)
      .set({
        preferences
      })
      .where(eq(movieSessions.id, sessionId))

    // Clear existing swipes when preferences change
    await db
      .delete(swipes)
      .where(eq(swipes.sessionId, sessionId))

    revalidatePath(`/sessions/${sessionId}`)
    return { isSuccess: true, message: "Preferences updated successfully", data: null }
  } catch (error) {
    console.error("Error updating session preferences:", error)
    return { isSuccess: false, message: "Failed to update preferences" }
  }
}

export async function deleteMovieSession(
  sessionId: string
): Promise<ActionState<any>> {
  try {
    const { userId } = await auth()
    if (!userId) {
      return { isSuccess: false, message: "Unauthorized" }
    }

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
      return { isSuccess: false, message: "Only the host can delete the session" }
    }

    // Delete all swipes for this session
    await db
      .delete(swipes)
      .where(eq(swipes.sessionId, sessionId))

    // Delete any match history
    await db
      .delete(matchHistory)
      .where(eq(matchHistory.sessionId, sessionId))

    // Delete the session
    await db
      .delete(movieSessions)
      .where(eq(movieSessions.id, sessionId))

    revalidatePath("/sessions")
    return { isSuccess: true, message: "Session deleted successfully", data: null }
  } catch (error) {
    console.error("Error deleting session:", error)
    return { isSuccess: false, message: "Failed to delete session" }
  }
}
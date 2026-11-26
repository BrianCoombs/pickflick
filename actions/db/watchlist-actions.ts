"use server"

import { getAuthenticatedUser } from "@/lib/auth/server"
import { db } from "@/db/db"
import { movieSessions } from "@/db/schema"
import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { ActionState } from "@/types/server-action-types"
import {
  checkLetterboxdUser,
  letterboxdEnabled
} from "@/lib/watchlists/letterboxd"
import { normalizeLetterboxdUsername } from "@/lib/watchlists/letterboxd-parse"
import {
  deleteSource,
  getSourcesForUsers,
  getUserSources,
  upsertSource,
  type LinkedSource,
  type SourceType
} from "@/lib/watchlists/sources"
import { revokeTraktToken } from "@/lib/watchlists/trakt"
import { allowedSourceTypes } from "@/lib/titles/sources"
import { parseMediaType } from "@/lib/titles/title"

export interface WatchlistOption {
  userId: string
  name: string
  sources: LinkedSource[]
}

export async function getMyWatchlistSources(): Promise<
  ActionState<{ sources: LinkedSource[]; letterboxdEnabled: boolean }>
> {
  const user = await getAuthenticatedUser()
  if (!user) return { isSuccess: false, message: "Unauthorized" }

  const sources = await getUserSources(user.id)
  return {
    isSuccess: true,
    message: "Sources retrieved",
    data: { sources, letterboxdEnabled: letterboxdEnabled() }
  }
}

const LETTERBOXD_ERRORS = {
  not_found: "We couldn't find that Letterboxd user.",
  private_or_empty:
    "That watchlist looks private or empty. Make it public on letterboxd.com (Settings → Privacy) and add a film.",
  blocked: "Letterboxd isn't answering us right now. Try again in a bit."
} as const

export async function saveLetterboxdUsername(
  input: string
): Promise<ActionState<LinkedSource>> {
  const user = await getAuthenticatedUser()
  if (!user) return { isSuccess: false, message: "Unauthorized" }
  if (!letterboxdEnabled()) {
    return { isSuccess: false, message: "Letterboxd isn't available yet" }
  }

  const username = normalizeLetterboxdUsername(input)
  if (!username) {
    return { isSuccess: false, message: "That isn't a Letterboxd username" }
  }

  try {
    const result = await checkLetterboxdUser(username)
    if (result !== "ok") {
      return { isSuccess: false, message: LETTERBOXD_ERRORS[result] }
    }
  } catch (error) {
    console.error("Letterboxd check failed:", error)
    return { isSuccess: false, message: LETTERBOXD_ERRORS.blocked }
  }

  await upsertSource({ userId: user.id, sourceType: "letterboxd", username })
  revalidatePath("/settings")
  return {
    isSuccess: true,
    message: "Letterboxd linked",
    data: { userId: user.id, sourceType: "letterboxd", username }
  }
}

export async function removeWatchlistSource(
  sourceType: SourceType
): Promise<ActionState<null>> {
  const user = await getAuthenticatedUser()
  if (!user) return { isSuccess: false, message: "Unauthorized" }

  const row = await deleteSource(user.id, sourceType)
  if (sourceType === "trakt" && row?.accessToken) {
    // Best effort: the link is already gone on our side
    await revokeTraktToken(row.accessToken).catch(error =>
      console.error("Trakt revoke failed:", error)
    )
  }

  revalidatePath("/settings")
  return { isSuccess: true, message: "Disconnected", data: null }
}

// Display names come from Neon Auth's user table (read-only for us)
async function getDisplayNames(
  userIds: string[]
): Promise<Map<string, string>> {
  const rows = await db.execute<{
    id: string
    name: string | null
    email: string
  }>(
    // Drizzle expands an interpolated array into a list: in ($1, $2, ...)
    sql`select id::text as id, name, email from neon_auth."user" where id::text in ${userIds}`
  )
  return new Map(
    rows.map(row => [row.id, row.name?.trim() || row.email.split("@")[0]])
  )
}

export async function getSessionWatchlistOptions(
  sessionId: string
): Promise<ActionState<WatchlistOption[]>> {
  const user = await getAuthenticatedUser()
  if (!user) return { isSuccess: false, message: "Unauthorized" }

  const [session] = await db
    .select({
      userIds: movieSessions.userIds,
      mediaType: movieSessions.mediaType
    })
    .from(movieSessions)
    .where(eq(movieSessions.id, sessionId))
    .limit(1)

  if (!session) return { isSuccess: false, message: "Session not found" }
  if (!session.userIds.includes(user.id)) {
    return { isSuccess: false, message: "You are not part of this session" }
  }

  const [names, sources] = await Promise.all([
    getDisplayNames(session.userIds),
    getSourcesForUsers(session.userIds)
  ])
  // Letterboxd only lists films, so TV sessions can't use it
  const allowed = allowedSourceTypes(parseMediaType(session.mediaType), {
    letterboxd: letterboxdEnabled()
  })
  const visible = sources.filter(source => allowed.includes(source.sourceType))

  return {
    isSuccess: true,
    message: "Options retrieved",
    data: session.userIds.map(userId => ({
      userId,
      name: userId === user.id ? "You" : (names.get(userId) ?? "Guest"),
      sources: visible.filter(source => source.userId === userId)
    }))
  }
}

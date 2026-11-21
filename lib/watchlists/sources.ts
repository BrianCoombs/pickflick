/*
<ai_context>
Reads and writes users' linked watchlist sources (user_movie_sources).
Server-only: Trakt rows hold OAuth tokens.
</ai_context>
*/

import { db } from "@/db/db"
import { userMovieSources, type SelectUserMovieSource } from "@/db/schema"
import { and, eq, inArray } from "drizzle-orm"
import { needsRefresh } from "./tokens"
import { refreshTraktToken } from "./trakt"

export type SourceType = "trakt" | "letterboxd"

export interface LinkedSource {
  userId: string
  sourceType: SourceType
  username: string
}

interface SourceMetadata {
  username: string
  expiresAt?: number // Trakt access token expiry, ms timestamp
}

function toLinked(row: SelectUserMovieSource): LinkedSource {
  return {
    userId: row.userId,
    sourceType: row.sourceType as SourceType,
    username: (row.metadata as SourceMetadata | null)?.username ?? ""
  }
}

export async function getUserSources(userId: string): Promise<LinkedSource[]> {
  const rows = await db
    .select()
    .from(userMovieSources)
    .where(eq(userMovieSources.userId, userId))
  return rows.map(toLinked)
}

export async function getSourcesForUsers(
  userIds: string[]
): Promise<LinkedSource[]> {
  if (userIds.length === 0) return []
  const rows = await db
    .select()
    .from(userMovieSources)
    .where(inArray(userMovieSources.userId, userIds))
  return rows.map(toLinked)
}

export async function upsertSource(source: {
  userId: string
  sourceType: SourceType
  username: string
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
}): Promise<void> {
  const values = {
    accessToken: source.accessToken ?? null,
    refreshToken: source.refreshToken ?? null,
    metadata: {
      username: source.username,
      expiresAt: source.expiresAt
    } satisfies SourceMetadata,
    updatedAt: new Date()
  }
  await db
    .insert(userMovieSources)
    .values({ userId: source.userId, sourceType: source.sourceType, ...values })
    .onConflictDoUpdate({
      target: [userMovieSources.userId, userMovieSources.sourceType],
      set: values
    })
}

// Returns the deleted row so the caller can revoke its token
export async function deleteSource(
  userId: string,
  sourceType: SourceType
): Promise<SelectUserMovieSource | undefined> {
  const [row] = await db
    .delete(userMovieSources)
    .where(
      and(
        eq(userMovieSources.userId, userId),
        eq(userMovieSources.sourceType, sourceType)
      )
    )
    .returning()
  return row
}

// A usable Trakt access token for the user, refreshed and saved first if it's
// about to expire. Throws if the user hasn't linked Trakt or the refresh fails
export async function getValidTraktToken(
  userId: string,
  redirectUri: string
): Promise<string> {
  const [row] = await db
    .select()
    .from(userMovieSources)
    .where(
      and(
        eq(userMovieSources.userId, userId),
        eq(userMovieSources.sourceType, "trakt")
      )
    )
    .limit(1)

  if (!row?.accessToken) throw new Error("Trakt is not linked")

  const metadata = row.metadata as SourceMetadata
  if (!needsRefresh(metadata.expiresAt)) return row.accessToken

  if (!row.refreshToken) throw new Error("Trakt link has no refresh token")
  const tokens = await refreshTraktToken(row.refreshToken, redirectUri)
  await upsertSource({
    userId,
    sourceType: "trakt",
    username: metadata.username,
    ...tokens
  })
  return tokens.accessToken
}

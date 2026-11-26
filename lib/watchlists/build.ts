/*
<ai_context>
Builds a session's movie or TV pool from the selected people's watchlists,
fetched live from Trakt and Letterboxd every time. Letterboxd only lists
films, so TV pools skip it, and so does every pool when LETTERBOXD_ENABLED is
"false".
</ai_context>
*/

import {
  combineWatchlistResults,
  type WatchlistResult,
  type WatchlistSourceRef
} from "./combine"
import { allowedSourceTypes } from "../titles/sources"
import type { MediaType } from "../titles/title"
import { getLetterboxdWatchlistTmdbIds, letterboxdEnabled } from "./letterboxd"
import { getSourcesForUsers, getValidTraktToken } from "./sources"
import { getTraktWatchlistTmdbIds } from "./trakt"

const POOL_SIZE = 50
const SOURCE_TIME_BUDGET_MS = 20_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Timed out")), ms)
    )
  ])
}

export interface WatchlistPoolOptions {
  mediaType?: MediaType
  // Ids already in the pool ("Add 50 more"); dropped before the shuffle/cap
  exclude?: number[]
}

export async function buildPoolFromWatchlists(
  sources: WatchlistSourceRef[],
  redirectUri: string,
  { mediaType = "movie", exclude = [] }: WatchlistPoolOptions = {}
): Promise<{ movieIds: number[]; failed: WatchlistSourceRef[] }> {
  // LETTERBOXD_ENABLED=false keeps Letterboxd out of pools, not just the UI
  const allowed = allowedSourceTypes(mediaType, {
    letterboxd: letterboxdEnabled()
  })
  const selected = sources.filter(s => allowed.includes(s.sourceType))
  const linked = await getSourcesForUsers(selected.map(s => s.userId))
  const deadline = Date.now() + SOURCE_TIME_BUDGET_MS

  const fetchIds = async (source: WatchlistSourceRef): Promise<number[]> => {
    const link = linked.find(
      l => l.userId === source.userId && l.sourceType === source.sourceType
    )
    if (!link) throw new Error("Source is no longer linked")

    if (source.sourceType === "trakt") {
      const token = await getValidTraktToken(source.userId, redirectUri)
      return getTraktWatchlistTmdbIds(token, mediaType)
    }
    return getLetterboxdWatchlistTmdbIds(link.username, deadline)
  }

  const results = await Promise.all(
    selected.map(async (source): Promise<WatchlistResult> => {
      try {
        // Letterboxd stops itself at the deadline; the timeout catches a
        // request that hangs
        const ids = await withTimeout(
          fetchIds(source),
          SOURCE_TIME_BUDGET_MS + 5_000
        )
        return { source, ids }
      } catch (error) {
        console.error(
          `Watchlist ${source.sourceType} for ${source.userId} failed:`,
          error
        )
        return { source, error }
      }
    })
  )

  return combineWatchlistResults(results, POOL_SIZE, exclude)
}

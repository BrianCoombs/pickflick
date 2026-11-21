/*
<ai_context>
Builds a session's movie pool from the selected people's watchlists, fetched
live from Trakt and Letterboxd every time.
</ai_context>
*/

import {
  combineWatchlistResults,
  type WatchlistResult,
  type WatchlistSourceRef
} from "./combine"
import { getLetterboxdWatchlistTmdbIds } from "./letterboxd"
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

export async function buildPoolFromWatchlists(
  selected: WatchlistSourceRef[],
  redirectUri: string
): Promise<{ movieIds: number[]; failed: WatchlistSourceRef[] }> {
  const linked = await getSourcesForUsers(selected.map(s => s.userId))
  const deadline = Date.now() + SOURCE_TIME_BUDGET_MS

  const fetchIds = async (source: WatchlistSourceRef): Promise<number[]> => {
    const link = linked.find(
      l => l.userId === source.userId && l.sourceType === source.sourceType
    )
    if (!link) throw new Error("Source is no longer linked")

    if (source.sourceType === "trakt") {
      const token = await getValidTraktToken(source.userId, redirectUri)
      return getTraktWatchlistTmdbIds(token)
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

  return combineWatchlistResults(results, POOL_SIZE)
}

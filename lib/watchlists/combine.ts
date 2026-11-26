import { buildWatchlistPool } from "./pool"

export interface WatchlistSourceRef {
  userId: string
  sourceType: "trakt" | "letterboxd"
}

export type WatchlistResult =
  | { source: WatchlistSourceRef; ids: number[]; error?: undefined }
  | { source: WatchlistSourceRef; error: unknown; ids?: undefined }

export function combineWatchlistResults(
  results: WatchlistResult[],
  size: number,
  exclude: Iterable<number> = []
): { movieIds: number[]; failed: WatchlistSourceRef[] } {
  return {
    movieIds: buildWatchlistPool(
      results.flatMap(r => (r.ids ? [r.ids] : [])),
      size,
      Math.random,
      exclude
    ),
    failed: results.filter(r => r.error !== undefined).map(r => r.source)
  }
}

import { TMDbAPI } from "./tmdb"
import { buildBalancedPool } from "./balanced-pool"
import { buildDiscoverParams } from "./discover-params"
import { db } from "@/db/db"
import { cachedMovies } from "@/db/schema"
import { voteFloor } from "@/lib/constants/movies"
import type { FilterPreferences } from "@/lib/sessions/preferences"
import { shuffle } from "@/lib/shuffle"
import { titleCacheKey } from "@/lib/titles/cache"
import type { MediaType, Title } from "@/lib/titles/title"
import { eq } from "drizzle-orm"

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
// The retry for short pools drops the vote floor to this
const MIN_VOTE_FLOOR = 50

async function readCache<T>(key: string): Promise<T | null> {
  try {
    const [cached] = await db
      .select()
      .from(cachedMovies)
      .where(eq(cachedMovies.tmdbId, key))
      .limit(1)

    if (!cached) return null
    if (Date.now() - new Date(cached.updatedAt).getTime() > CACHE_TTL_MS) {
      return null
    }
    return cached.data as T
  } catch (error) {
    console.error("Cache read error:", error)
    return null
  }
}

async function writeCache(key: string, data: unknown): Promise<void> {
  try {
    await db
      .insert(cachedMovies)
      .values({ tmdbId: key, data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: cachedMovies.tmdbId,
        set: { data, updatedAt: new Date() }
      })
  } catch (error) {
    console.error("Cache write error:", error)
  }
}

// A movie or show with trailer and providers, cached for 24 hours in
// cached_movies under "movie:603" / "tv:42009"
export async function getEnrichedTitle(
  mediaType: MediaType,
  id: number
): Promise<Title> {
  const key = titleCacheKey(mediaType, id)
  const cached = await readCache<Title>(key)
  if (cached && cached.key === key) return cached

  const title = await new TMDbAPI().getTitle(mediaType, id)
  await writeCache(key, title)
  return title
}

export interface TitlePoolOptions {
  mediaType: MediaType
  prefs: FilterPreferences
  size?: number
  // Ids already in the pool ("Add 50 more")
  exclude?: number[]
}

// Pool of TMDb ids from discover, mixed evenly across the chosen genres (any
// of them). Never padded with titles outside the filters: a short pool is
// returned short. `exhausted` means TMDb ran out before reaching `size`.
export async function getTitlePool({
  mediaType,
  prefs,
  size = 50,
  exclude = []
}: TitlePoolOptions): Promise<{ ids: number[]; exhausted: boolean }> {
  const tmdb = new TMDbAPI()
  // One bucket per genre, or a single bucket with no genre filter
  const genres: (number | undefined)[] =
    prefs.genres.length > 0 ? prefs.genres : [undefined]
  // Excluded ids use up pages, so look further when there are many
  const maxPagesPerBucket = Math.min(25, 5 + Math.ceil(exclude.length / 20))

  const run = (floor: number, skip: number[], want: number) =>
    buildBalancedPool({
      bucketCount: genres.length,
      size: want,
      exclude: skip,
      maxPagesPerBucket,
      fetchPage: async (bucket, page) => {
        const params = buildDiscoverParams(mediaType, prefs, {
          genreId: genres[bucket],
          page,
          voteFloor: floor
        })
        try {
          return await tmdb.discover(mediaType, params)
        } catch (error) {
          // A first page failing means TMDb is down: let the caller know.
          // A later one just ends that bucket
          if (page === 1) throw error
          console.error(`TMDb discover page ${page} failed:`, error)
          return { ids: [], totalPages: 0 }
        }
      }
    })

  const floor = voteFloor(prefs.minRating)
  let { ids, exhausted } = await run(floor, exclude, size)

  // High ratings with a high vote floor can leave very few titles; try once
  // more with the lowest floor, keeping what was found
  if (ids.length < size && floor > MIN_VOTE_FLOOR) {
    const more = await run(
      MIN_VOTE_FLOOR,
      [...exclude, ...ids],
      size - ids.length
    )
    ids = [...ids, ...more.ids]
    exhausted = more.exhausted
  }

  return { ids: shuffle(ids).slice(0, size), exhausted }
}

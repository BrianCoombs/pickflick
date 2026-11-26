import { TMDbAPI, type Movie, type MovieDetails } from "./tmdb"
import { OMDbAPI } from "./omdb"
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

export interface EnrichedMovie extends MovieDetails {
  enrichedRatings?: {
    tmdb: string
    imdb?: string
    rottenTomatoes?: string
    metacritic?: string
  }
  trailerUrl?: string
}

export class MovieService {
  private tmdb: TMDbAPI
  private omdb: OMDbAPI | null

  constructor() {
    this.tmdb = new TMDbAPI()

    // OMDb is optional
    try {
      this.omdb = new OMDbAPI()
    } catch {
      this.omdb = null
    }
  }

  getEnrichedTitle = getEnrichedTitle
  getTitlePool = getTitlePool

  /** @deprecated Use getEnrichedTitle(mediaType, id). Kept until the match page moves to Title */
  async getEnrichedMovie(
    tmdbId: number,
    imdbId?: string
  ): Promise<EnrichedMovie> {
    // Check cache first
    const cached = await this.getCachedMovie(tmdbId.toString())
    if (cached) {
      return cached
    }

    // Get base movie data from TMDb
    const tmdbMovie = await this.tmdb.getMovie(tmdbId)

    let enrichedMovie: EnrichedMovie = {
      ...tmdbMovie,
      enrichedRatings: {
        tmdb: `${tmdbMovie.vote_average}/10`
      }
    }

    // Get trailer
    try {
      const videos = await this.tmdb.getMovieVideos(tmdbId)
      if (videos.length > 0) {
        enrichedMovie.trailerUrl = `https://www.youtube.com/watch?v=${videos[0].key}`
      }
    } catch (error) {
      console.error("Failed to fetch movie videos:", error)
    }

    // Enrich with OMDb data if available
    if (this.omdb && imdbId) {
      try {
        const omdbMovie = await this.omdb.getMovieByImdbId(imdbId)
        const ratings = OMDbAPI.parseRatings(omdbMovie)

        enrichedMovie.enrichedRatings = {
          tmdb:
            enrichedMovie.enrichedRatings?.tmdb ||
            `${tmdbMovie.vote_average}/10`,
          ...ratings
        }
      } catch (error) {
        console.error("Failed to fetch OMDb data:", error)
      }
    }

    // Cache the result
    await this.cacheMovie(tmdbId.toString(), enrichedMovie)

    return enrichedMovie
  }

  async searchMovies(query: string, page = 1): Promise<Movie[]> {
    const result = await this.tmdb.searchMovies(query, page)
    return result.results
  }

  async getPopularMovies(page = 1): Promise<Movie[]> {
    return this.tmdb.getPopularMovies(page)
  }

  async getTopRatedMovies(page = 1): Promise<Movie[]> {
    return this.tmdb.getTopRatedMovies(page)
  }

  async getMovieRecommendations(tmdbId: number, page = 1): Promise<Movie[]> {
    return this.tmdb.getMovieRecommendations(tmdbId, page)
  }

  /**
   * @deprecated Use getTitlePool. This one tops short pools up with popular
   * movies that ignore the filters
   */
  async getMoviePool(config: {
    userIds: string[]
    poolSize: number
    filters?: {
      genres?: number[]
      minYear?: number
      maxYear?: number
      minRating?: number
    }
  }): Promise<Movie[]> {
    const pool: Movie[] = []
    const movieIds = new Set<number>()
    const targetSize = Math.max(config.poolSize, 50) // Minimum 50 movies

    // If we have filters, use the discover API
    if (
      config.filters &&
      (config.filters.genres?.length ||
        config.filters.minYear ||
        config.filters.maxYear)
    ) {
      // Convert filters to API format
      const discoverParams: Parameters<typeof this.tmdb.discoverMovies>[0] = {
        page: 1,
        withGenres: config.filters.genres,
        voteAverageGte: config.filters.minRating || 6,
        sortBy: "popularity.desc"
      }

      // Handle year filtering
      if (config.filters.minYear) {
        discoverParams.primaryReleaseDateGte = `${config.filters.minYear}-01-01`
      }
      if (config.filters.maxYear) {
        discoverParams.primaryReleaseDateLte = `${config.filters.maxYear}-12-31`
      }

      // Fetch movies with pagination until we have enough
      let page = 1
      let totalPages = 1

      while (pool.length < targetSize && page <= totalPages && page <= 10) {
        // Max 10 pages to avoid too many API calls
        try {
          const result = await this.tmdb.discoverMovies({
            ...discoverParams,
            page
          })

          totalPages = result.total_pages

          // Add unique movies to pool
          for (const movie of result.results) {
            if (!movieIds.has(movie.id)) {
              movieIds.add(movie.id)
              pool.push(movie)
            }
          }

          page++
        } catch (error) {
          console.error(`Error fetching page ${page}:`, error)
          break
        }
      }

      // If we still don't have enough movies, supplement with popular movies
      if (pool.length < targetSize) {
        const supplementPage = 1
        const popular = await this.getPopularMovies(supplementPage)

        for (const movie of popular) {
          if (!movieIds.has(movie.id)) {
            // Apply basic year filter if specified
            if (config.filters) {
              const year = new Date(movie.release_date).getFullYear()
              if (config.filters.minYear && year < config.filters.minYear)
                continue
              if (config.filters.maxYear && year > config.filters.maxYear)
                continue
              if (
                config.filters.minRating &&
                movie.vote_average < config.filters.minRating
              )
                continue
            }

            movieIds.add(movie.id)
            pool.push(movie)

            if (pool.length >= targetSize) break
          }
        }
      }
    } else {
      // No specific filters, use mix of popular and top-rated
      const [popular, topRated] = await Promise.all([
        this.getPopularMovies(),
        this.getTopRatedMovies()
      ])

      // Add movies ensuring no duplicates
      const addMovies = (movies: Movie[], limit: number) => {
        for (const movie of movies) {
          if (movieIds.has(movie.id)) continue

          // Apply basic filters if any
          if (config.filters) {
            const year = new Date(movie.release_date).getFullYear()

            if (config.filters.minYear && year < config.filters.minYear)
              continue
            if (config.filters.maxYear && year > config.filters.maxYear)
              continue
            if (
              config.filters.minRating &&
              movie.vote_average < config.filters.minRating
            )
              continue
          }

          movieIds.add(movie.id)
          pool.push(movie)

          if (pool.length >= limit) break
        }
      }

      // Mix different sources
      addMovies(popular, Math.floor(targetSize * 0.5))
      addMovies(topRated, Math.floor(targetSize * 0.5))
    }

    // Shuffle the pool
    return pool.sort(() => Math.random() - 0.5).slice(0, config.poolSize)
  }

  private async getCachedMovie(tmdbId: string): Promise<EnrichedMovie | null> {
    return readCache<EnrichedMovie>(tmdbId)
  }

  private async cacheMovie(
    tmdbId: string,
    movie: EnrichedMovie
  ): Promise<void> {
    await writeCache(tmdbId, movie)
  }

  // Static helper methods
  static getPosterUrl = TMDbAPI.getPosterUrl
  static getBackdropUrl = TMDbAPI.getBackdropUrl
}

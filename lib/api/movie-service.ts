import { TMDbAPI, type Movie, type MovieDetails } from "./tmdb"
import { OMDbAPI, type OMDbMovie } from "./omdb"
import { db } from "@/db/db"
import { cachedMovies } from "@/db/schema"
import { eq } from "drizzle-orm"

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
          ...enrichedMovie.enrichedRatings,
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

    // For now, just mix popular and top-rated movies
    // TODO: Integrate with user watchlists from Letterboxd/Plex
    const [popular, topRated] = await Promise.all([
      this.getPopularMovies(),
      this.getTopRatedMovies()
    ])

    // Add movies ensuring no duplicates
    const addMovies = (movies: Movie[], limit: number) => {
      for (const movie of movies) {
        if (movieIds.has(movie.id)) continue

        // Apply filters
        if (config.filters) {
          const year = new Date(movie.release_date).getFullYear()

          if (config.filters.minYear && year < config.filters.minYear) continue
          if (config.filters.maxYear && year > config.filters.maxYear) continue
          if (
            config.filters.minRating &&
            movie.vote_average < config.filters.minRating
          )
            continue
          if (config.filters.genres && movie.genre_ids) {
            const hasGenre = config.filters.genres.some(g =>
              movie.genre_ids?.includes(g)
            )
            if (!hasGenre) continue
          }
        }

        movieIds.add(movie.id)
        pool.push(movie)

        if (pool.length >= limit) break
      }
    }

    // Mix different sources
    addMovies(popular, Math.floor(config.poolSize * 0.5))
    addMovies(topRated, Math.floor(config.poolSize * 0.5))

    // Shuffle the pool
    return pool.sort(() => Math.random() - 0.5).slice(0, config.poolSize)
  }

  private async getCachedMovie(tmdbId: string): Promise<EnrichedMovie | null> {
    try {
      const [cached] = await db
        .select()
        .from(cachedMovies)
        .where(eq(cachedMovies.tmdbId, tmdbId))
        .limit(1)

      if (!cached) return null

      // Check if cache is still fresh (24 hours)
      const cacheAge = Date.now() - new Date(cached.updatedAt).getTime()
      if (cacheAge > 24 * 60 * 60 * 1000) {
        return null
      }

      return cached.data as EnrichedMovie
    } catch (error) {
      console.error("Cache read error:", error)
      return null
    }
  }

  private async cacheMovie(
    tmdbId: string,
    movie: EnrichedMovie
  ): Promise<void> {
    try {
      await db
        .insert(cachedMovies)
        .values({
          tmdbId,
          data: movie,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: cachedMovies.tmdbId,
          set: {
            data: movie,
            updatedAt: new Date()
          }
        })
    } catch (error) {
      console.error("Cache write error:", error)
    }
  }

  // Static helper methods
  static getPosterUrl = TMDbAPI.getPosterUrl
  static getBackdropUrl = TMDbAPI.getBackdropUrl
}

import { z } from "zod"
import { movieToTitle, tvToTitle } from "../titles/normalize"
import type { MediaType, Title } from "../titles/title"

const TMDB_BASE_URL = "https://api.themoviedb.org/3"
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p"

export const MovieSchema = z.object({
  id: z.number(),
  title: z.string(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  release_date: z.string(),
  vote_average: z.number(),
  vote_count: z.number(),
  genre_ids: z.array(z.number()).optional(),
  genres: z
    .array(
      z.object({
        id: z.number(),
        name: z.string()
      })
    )
    .optional()
})

export type Movie = z.infer<typeof MovieSchema>

export const MovieDetailsSchema = MovieSchema.extend({
  runtime: z.number(),
  tagline: z.string(),
  status: z.string(),
  production_companies: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      logo_path: z.string().nullable(),
      origin_country: z.string()
    })
  )
})

export type MovieDetails = z.infer<typeof MovieDetailsSchema>

// Lenient detail schemas for getTitle. Only the id is required: any other
// field that is missing, null or the wrong type becomes null, so a gap in
// TMDb's data never drops a title (new shows often lack tagline, counts or
// episode_run_time). lib/titles/normalize turns the nulls into defaults.
const lenient = <T extends z.ZodTypeAny>(schema: T) =>
  schema.nullish().catch(null)

const GenreSchema = z.object({
  id: lenient(z.number()),
  name: lenient(z.string())
})

const VideosSchema = z.object({
  results: lenient(
    z.array(
      z.object({
        site: lenient(z.string()),
        type: lenient(z.string()),
        key: lenient(z.string()),
        official: lenient(z.boolean())
      })
    )
  )
})

const WatchProvidersSchema = z.object({
  results: lenient(
    z.record(
      z.string(),
      lenient(
        z.object({
          flatrate: lenient(
            z.array(
              z.object({
                provider_id: lenient(z.number()),
                provider_name: lenient(z.string()),
                logo_path: lenient(z.string()),
                display_priority: lenient(z.number())
              })
            )
          )
        })
      )
    )
  )
})

const TitleDetailsSchema = z.object({
  id: z.number(),
  overview: lenient(z.string()),
  poster_path: lenient(z.string()),
  backdrop_path: lenient(z.string()),
  genres: lenient(z.array(GenreSchema)),
  vote_average: lenient(z.number()),
  vote_count: lenient(z.number()),
  tagline: lenient(z.string()),
  status: lenient(z.string()),
  videos: lenient(VideosSchema),
  "watch/providers": lenient(WatchProvidersSchema)
})

export const MovieTitleDetailsSchema = TitleDetailsSchema.extend({
  title: lenient(z.string()),
  release_date: lenient(z.string()),
  runtime: lenient(z.number())
})

export const TvDetailsSchema = TitleDetailsSchema.extend({
  name: lenient(z.string()),
  first_air_date: lenient(z.string()),
  number_of_seasons: lenient(z.number()),
  number_of_episodes: lenient(z.number()),
  episode_run_time: lenient(z.array(z.number())),
  last_episode_to_air: lenient(z.object({ runtime: lenient(z.number()) }))
})

export type TvDetails = z.infer<typeof TvDetailsSchema>

const DiscoverPageSchema = z.object({
  results: lenient(z.array(z.object({ id: lenient(z.number()) }))),
  total_pages: lenient(z.number())
})

export class TMDbAPI {
  private apiKey: string
  private readAccessToken: string

  constructor() {
    const apiKey = process.env.TMDB_API_KEY
    const readAccessToken = process.env.TMDB_API_READ_ACCESS_TOKEN

    if (!apiKey || !readAccessToken) {
      throw new Error("TMDb API credentials not configured")
    }

    this.apiKey = apiKey
    this.readAccessToken = readAccessToken
  }

  private async fetch<T>(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<T> {
    const url = new URL(`${TMDB_BASE_URL}${endpoint}`)

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.readAccessToken}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`TMDb API error: ${response.statusText}`)
    }

    return response.json()
  }

  // One title, movie or TV, with trailer and streaming providers in the same
  // call. Ids are per media type: /movie/42009 isn't /tv/42009
  async getTitle(mediaType: MediaType, id: number): Promise<Title> {
    const data = await this.fetch<unknown>(`/${mediaType}/${id}`, {
      append_to_response: "videos,watch/providers"
    })
    return mediaType === "tv"
      ? tvToTitle(TvDetailsSchema.parse(data))
      : movieToTitle(MovieTitleDetailsSchema.parse(data))
  }

  // GET /discover/{movie|tv} with a query from buildDiscoverParams. Returns
  // just the ids in TMDb's order and how many pages there are
  async discover(
    mediaType: MediaType,
    params: Record<string, string>
  ): Promise<{ ids: number[]; totalPages: number }> {
    const data = DiscoverPageSchema.parse(
      await this.fetch<unknown>(`/discover/${mediaType}`, params)
    )
    return {
      ids: (data.results ?? []).flatMap(r =>
        typeof r.id === "number" ? [r.id] : []
      ),
      totalPages: data.total_pages ?? 0
    }
  }

  /** @deprecated Use getTitle("movie", id). Kept until the pages move to Title */
  async getMovie(movieId: number): Promise<MovieDetails> {
    const data = await this.fetch<MovieDetails>(`/movie/${movieId}`)
    return MovieDetailsSchema.parse(data)
  }

  async searchMovies(
    query: string,
    page = 1
  ): Promise<{
    results: Movie[]
    total_pages: number
    total_results: number
  }> {
    const response = await this.fetch<any>("/search/movie", {
      query,
      page: page.toString()
    })

    return {
      results: z.array(MovieSchema).parse(response.results),
      total_pages: response.total_pages,
      total_results: response.total_results
    }
  }

  async getPopularMovies(page = 1): Promise<Movie[]> {
    const response = await this.fetch<any>("/movie/popular", {
      page: page.toString()
    })
    return z.array(MovieSchema).parse(response.results)
  }

  async getTopRatedMovies(page = 1): Promise<Movie[]> {
    const response = await this.fetch<any>("/movie/top_rated", {
      page: page.toString()
    })
    return z.array(MovieSchema).parse(response.results)
  }

  async getUpcomingMovies(page = 1): Promise<Movie[]> {
    const response = await this.fetch<any>("/movie/upcoming", {
      page: page.toString()
    })
    return z.array(MovieSchema).parse(response.results)
  }

  async getMovieRecommendations(movieId: number, page = 1): Promise<Movie[]> {
    const response = await this.fetch<any>(
      `/movie/${movieId}/recommendations`,
      {
        page: page.toString()
      }
    )
    return z.array(MovieSchema).parse(response.results)
  }

  async getMovieCredits(movieId: number) {
    return this.fetch(`/movie/${movieId}/credits`)
  }

  /** @deprecated getTitle includes the trailer (Title.trailerUrl) */
  async getMovieVideos(movieId: number) {
    const response = await this.fetch<any>(`/movie/${movieId}/videos`)
    return response.results.filter(
      (video: any) => video.site === "YouTube" && video.type === "Trailer"
    )
  }

  /**
   * @deprecated Use discover(mediaType, buildDiscoverParams(...)). Its
   * with_genres join(",") is AND, not OR
   */
  async discoverMovies(params: {
    page?: number
    withGenres?: number[]
    primaryReleaseDateGte?: string // Format: YYYY-MM-DD
    primaryReleaseDateLte?: string // Format: YYYY-MM-DD
    voteAverageGte?: number
    sortBy?: string
  }): Promise<{
    results: Movie[]
    total_pages: number
    total_results: number
  }> {
    const queryParams: Record<string, string> = {
      page: (params.page || 1).toString(),
      sort_by: params.sortBy || "popularity.desc",
      "vote_count.gte": "50" // Ensure movies have enough votes
    }

    if (params.withGenres && params.withGenres.length > 0) {
      queryParams.with_genres = params.withGenres.join(",")
    }

    if (params.primaryReleaseDateGte) {
      queryParams["primary_release_date.gte"] = params.primaryReleaseDateGte
    }

    if (params.primaryReleaseDateLte) {
      queryParams["primary_release_date.lte"] = params.primaryReleaseDateLte
    }

    if (params.voteAverageGte) {
      queryParams["vote_average.gte"] = params.voteAverageGte.toString()
    }

    const response = await this.fetch<any>("/discover/movie", queryParams)

    return {
      results: z.array(MovieSchema).parse(response.results),
      total_pages: response.total_pages,
      total_results: response.total_results
    }
  }

  static getPosterUrl(
    posterPath: string | null,
    size: "w200" | "w500" | "original" = "w500"
  ): string | null {
    if (!posterPath) return null
    return `${TMDB_IMAGE_BASE_URL}/${size}${posterPath}`
  }

  static getBackdropUrl(
    backdropPath: string | null,
    size: "w500" | "w1280" | "original" = "w1280"
  ): string | null {
    if (!backdropPath) return null
    return `${TMDB_IMAGE_BASE_URL}/${size}${backdropPath}`
  }
}

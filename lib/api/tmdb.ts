import { z } from "zod"

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

  async getMovieVideos(movieId: number) {
    const response = await this.fetch<any>(`/movie/${movieId}/videos`)
    return response.results.filter(
      (video: any) => video.site === "YouTube" && video.type === "Trailer"
    )
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

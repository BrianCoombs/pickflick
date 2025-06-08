import { z } from "zod"

const OMDB_BASE_URL = "https://www.omdbapi.com"

export const OMDbMovieSchema = z.object({
  Title: z.string(),
  Year: z.string(),
  Rated: z.string(),
  Released: z.string(),
  Runtime: z.string(),
  Genre: z.string(),
  Director: z.string(),
  Writer: z.string(),
  Actors: z.string(),
  Plot: z.string(),
  Language: z.string(),
  Country: z.string(),
  Awards: z.string(),
  Poster: z.string(),
  Ratings: z.array(
    z.object({
      Source: z.string(),
      Value: z.string(),
    })
  ),
  Metascore: z.string(),
  imdbRating: z.string(),
  imdbVotes: z.string(),
  imdbID: z.string(),
  Type: z.string(),
  DVD: z.string().optional(),
  BoxOffice: z.string().optional(),
  Production: z.string().optional(),
  Website: z.string().optional(),
  Response: z.string(),
})

export type OMDbMovie = z.infer<typeof OMDbMovieSchema>

export class OMDbAPI {
  private apiKey: string

  constructor() {
    const apiKey = process.env.OMDB_API_KEY

    if (!apiKey) {
      throw new Error("OMDb API key not configured")
    }

    this.apiKey = apiKey
  }

  private async fetch<T>(params: Record<string, string>): Promise<T> {
    const url = new URL(OMDB_BASE_URL)
    url.searchParams.append("apikey", this.apiKey)
    
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value)
    })

    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`OMDb API error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.Response === "False") {
      throw new Error(`OMDb API error: ${data.Error}`)
    }

    return data
  }

  async getMovieByImdbId(imdbId: string): Promise<OMDbMovie> {
    const data = await this.fetch<OMDbMovie>({
      i: imdbId,
      plot: "full",
    })
    return OMDbMovieSchema.parse(data)
  }

  async searchMovies(title: string, year?: string): Promise<OMDbMovie> {
    const params: Record<string, string> = {
      t: title,
      plot: "full",
    }

    if (year) {
      params.y = year
    }

    const data = await this.fetch<OMDbMovie>(params)
    return OMDbMovieSchema.parse(data)
  }

  static parseRatings(movie: OMDbMovie) {
    const ratings: Record<string, string> = {}
    
    movie.Ratings.forEach(rating => {
      switch (rating.Source) {
        case "Internet Movie Database":
          ratings.imdb = rating.Value
          break
        case "Rotten Tomatoes":
          ratings.rottenTomatoes = rating.Value
          break
        case "Metacritic":
          ratings.metacritic = rating.Value
          break
      }
    })

    return ratings
  }
}
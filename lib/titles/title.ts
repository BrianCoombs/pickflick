// One shape for movies and TV shows, so screens never branch on TMDb's
// different field names (title/name, release_date/first_air_date, ...)
export type MediaType = "movie" | "tv"

export interface TitleProvider {
  id: number
  name: string
  logoPath: string | null
}

export interface Title {
  mediaType: MediaType
  id: number // TMDb id within mediaType's id space
  key: string // "movie:603" | "tv:42009" — React keys, cache keys
  name: string // movie.title | tv.name
  overview: string
  posterPath: string | null
  backdropPath: string | null
  year: number | null // yearOf(release_date | first_air_date)
  genres: { id: number; name: string }[]
  rating: number // vote_average
  voteCount: number
  runtimeMinutes: number | null // movie: runtime; tv: episode runtime
  seasons: number | null // tv: number_of_seasons; movie: null
  episodes: number | null // tv: number_of_episodes; movie: null
  tagline: string | null // "" → null
  trailerUrl: string | null // first YouTube "Trailer" in appended videos
  providers: TitleProvider[] // US subscription streaming, by display_priority
}

// Server actions take whatever the client sends; anything unknown is a movie
export function parseMediaType(value: unknown): MediaType {
  return value === "tv" ? "tv" : "movie"
}

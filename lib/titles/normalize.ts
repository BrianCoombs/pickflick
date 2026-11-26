import { titleCacheKey } from "./cache"
import type { MediaType, Title, TitleProvider } from "./title"

// Loose shapes of TMDb details responses. Validation is lib/api/tmdb.ts's job;
// these functions only promise not to throw on null, missing or "" fields
type Maybe<T> = T | null | undefined

interface RawGenre {
  id?: Maybe<number>
  name?: Maybe<string>
}

interface RawProvider {
  provider_id?: Maybe<number>
  provider_name?: Maybe<string>
  logo_path?: Maybe<string>
  display_priority?: Maybe<number>
}

export interface RawWatchProviders {
  results?: Maybe<
    Record<string, Maybe<{ flatrate?: Maybe<readonly RawProvider[]> }>>
  >
}

interface RawVideo {
  site?: Maybe<string>
  type?: Maybe<string>
  key?: Maybe<string>
  official?: Maybe<boolean>
}

export interface RawVideos {
  results?: Maybe<readonly RawVideo[]>
}

interface RawDetails {
  id: number
  overview?: Maybe<string>
  poster_path?: Maybe<string>
  backdrop_path?: Maybe<string>
  genres?: Maybe<readonly RawGenre[]>
  vote_average?: Maybe<number>
  vote_count?: Maybe<number>
  tagline?: Maybe<string>
  videos?: Maybe<RawVideos>
  "watch/providers"?: Maybe<RawWatchProviders>
}

export interface RawMovieDetails extends RawDetails {
  title?: Maybe<string>
  release_date?: Maybe<string>
  runtime?: Maybe<number>
}

export interface RawTvDetails extends RawDetails {
  name?: Maybe<string>
  first_air_date?: Maybe<string>
  number_of_seasons?: Maybe<number>
  number_of_episodes?: Maybe<number>
  episode_run_time?: Maybe<readonly number[]>
  last_episode_to_air?: Maybe<{ runtime?: Maybe<number> }>
}

// "2000-01-01" → 2000. Slices the string: new Date("2000-01-01") is midnight
// UTC, which is still 1999 in US time zones
export function yearOf(date: Maybe<string>): number | null {
  const year = typeof date === "string" ? date.slice(0, 4) : ""
  return /^\d{4}$/.test(year) ? Number(year) : null
}

function positive(value: Maybe<number>): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null
}

function count(value: Maybe<number>): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function text(value: Maybe<string>): string | null {
  const trimmed = typeof value === "string" ? value.trim() : ""
  return trimmed === "" ? null : trimmed
}

function genresFrom(genres: Maybe<readonly RawGenre[]>) {
  return (genres ?? []).flatMap(g =>
    typeof g?.id === "number" && typeof g.name === "string"
      ? [{ id: g.id, name: g.name }]
      : []
  )
}

// Subscription streaming (flatrate) in one region, by TMDb's display order
export function providersFrom(
  raw: Maybe<RawWatchProviders>,
  region = "US"
): TitleProvider[] {
  const flatrate = raw?.results?.[region]?.flatrate ?? []
  return flatrate
    .filter(
      p =>
        typeof p?.provider_id === "number" &&
        typeof p.provider_name === "string"
    )
    .map((p, index) => ({ p, index }))
    .sort(
      (a, b) =>
        (a.p.display_priority ?? Infinity) -
          (b.p.display_priority ?? Infinity) || a.index - b.index
    )
    .map(({ p }) => ({
      id: p.provider_id as number,
      name: p.provider_name as string,
      logoPath: p.logo_path ?? null
    }))
}

// First YouTube trailer, preferring official ones
export function trailerFrom(videos: Maybe<RawVideos>): string | null {
  const trailers = (videos?.results ?? []).filter(
    v => v?.site === "YouTube" && v.type === "Trailer" && !!v.key
  )
  const trailer = trailers.find(v => v.official) ?? trailers[0]
  return trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null
}

function shared(mediaType: MediaType, d: RawDetails, region: string) {
  return {
    mediaType,
    id: d.id,
    key: titleCacheKey(mediaType, d.id),
    overview: d.overview ?? "",
    posterPath: d.poster_path || null,
    backdropPath: d.backdrop_path || null,
    genres: genresFrom(d.genres),
    rating: count(d.vote_average) ?? 0,
    voteCount: count(d.vote_count) ?? 0,
    tagline: text(d.tagline),
    trailerUrl: trailerFrom(d.videos),
    providers: providersFrom(d["watch/providers"], region)
  }
}

export function movieToTitle(d: RawMovieDetails, region = "US"): Title {
  return {
    ...shared("movie", d, region),
    name: d.title ?? "",
    year: yearOf(d.release_date),
    runtimeMinutes: positive(d.runtime),
    seasons: null,
    episodes: null
  }
}

// episode_run_time is often [], so fall back to the last episode's runtime
export function tvToTitle(d: RawTvDetails, region = "US"): Title {
  return {
    ...shared("tv", d, region),
    name: d.name ?? "",
    year: yearOf(d.first_air_date),
    runtimeMinutes:
      positive(d.episode_run_time?.[0]) ??
      positive(d.last_episode_to_air?.runtime),
    seasons: count(d.number_of_seasons),
    episodes: count(d.number_of_episodes)
  }
}

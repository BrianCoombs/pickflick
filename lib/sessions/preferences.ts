import { RATING_STEPS, type RatingStep } from "../constants/movies"
import {
  isProviderKey,
  providerByKey,
  type ProviderKey
} from "../constants/providers"
import { genresFor, sanitizeGenres } from "../titles/genres"
import type { MediaType } from "../titles/title"
import type { WatchlistSourceRef } from "../watchlists/combine"

export type { ProviderKey, RatingStep }

// Media type is a session column (movie_sessions.media_type), not part of
// these preferences
export interface FilterPreferences {
  version: 2
  mode: "filters"
  genres: number[] // any of; empty = any genre; ids valid for the media type
  minYear?: number
  maxYear?: number
  minRating: RatingStep // 0 = any
  providers: ProviderKey[] // any of; empty = anywhere
  region: "US"
}

export interface WatchlistPreferences {
  mode: "watchlists"
  sources: WatchlistSourceRef[]
}

export type SessionPreferences = FilterPreferences | WatchlistPreferences

const DEFAULT_MIN_RATING: RatingStep = 6

export function defaultFilterPreferences(): FilterPreferences {
  return {
    version: 2,
    mode: "filters",
    genres: [],
    minRating: DEFAULT_MIN_RATING,
    providers: [],
    region: "US"
  }
}

const MIN_YEAR = 1900
const SOURCE_TYPES: readonly string[] = ["trakt", "letterboxd"]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

function cleanYear(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined
  const maxYear = new Date().getFullYear() + 1
  return Math.min(maxYear, Math.max(MIN_YEAR, Math.trunc(value)))
}

// Snaps down to the nearest step: 6.5 -> 6, 3 -> 0, 9 -> 8
function cleanRating(value: unknown): RatingStep {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_MIN_RATING
  }
  return [...RATING_STEPS].reverse().find(step => value >= step) ?? 0
}

function cleanProviders(value: unknown): ProviderKey[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter(isProviderKey)))
}

function cleanSources(value: unknown): WatchlistSourceRef[] {
  if (!Array.isArray(value)) return []
  return value.flatMap(source =>
    isRecord(source) &&
    typeof source.userId === "string" &&
    source.userId !== "" &&
    typeof source.sourceType === "string" &&
    SOURCE_TYPES.includes(source.sourceType)
      ? [
          {
            userId: source.userId,
            sourceType: source.sourceType as WatchlistSourceRef["sourceType"]
          }
        ]
      : []
  )
}

// Turns whatever is saved (or submitted) into the current shape. Old filter
// preferences have no `mode` or `version`; they keep their genres, years and
// rating. Use on the server for untrusted input and on the client for the
// form's starting values.
export function normalizePreferences(
  raw: unknown,
  mediaType: MediaType
): SessionPreferences {
  const input = isRecord(raw) ? raw : {}

  if (input.mode === "watchlists") {
    return { mode: "watchlists", sources: cleanSources(input.sources) }
  }

  let minYear = cleanYear(input.minYear)
  let maxYear = cleanYear(input.maxYear)
  if (minYear !== undefined && maxYear !== undefined && minYear > maxYear) {
    ;[minYear, maxYear] = [maxYear, minYear]
  }

  return {
    version: 2,
    mode: "filters",
    genres: sanitizeGenres(
      mediaType,
      Array.isArray(input.genres) ? input.genres : []
    ),
    ...(minYear !== undefined && { minYear }),
    ...(maxYear !== undefined && { maxYear }),
    minRating: cleanRating(input.minRating),
    providers: cleanProviders(input.providers),
    region: "US"
  }
}

function describeYears(minYear?: number, maxYear?: number): string | null {
  if (minYear !== undefined && maxYear !== undefined) {
    return minYear === maxYear ? `${minYear}` : `${minYear}–${maxYear}`
  }
  if (minYear !== undefined) return `${minYear} or later`
  if (maxYear !== undefined) return `Up to ${maxYear}`
  return null
}

// Short lines for the read-only "Rental terms" panel. Watchlist source names
// are resolved by the caller; this only counts them.
export function describePreferences(
  p: SessionPreferences,
  mediaType: MediaType
): string[] {
  if (p.mode === "watchlists") {
    const count = p.sources.length
    return ["From watchlists", `${count} ${count === 1 ? "list" : "lists"}`]
  }

  const names = new Map(genresFor(mediaType).map(g => [g.id, g.name]))
  const genreNames = p.genres.flatMap(id => names.get(id) ?? [])
  const providerNames = p.providers.flatMap(
    key => providerByKey(key)?.name ?? []
  )

  return [
    genreNames.length > 0 ? genreNames.join(", ") : "Any genre",
    describeYears(p.minYear, p.maxYear),
    p.minRating > 0 ? `${p.minRating}+ rating` : null,
    providerNames.length > 0 ? providerNames.join(", ") : null
  ].filter((line): line is string => line !== null)
}

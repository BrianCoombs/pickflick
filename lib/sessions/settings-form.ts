import { YEAR_RANGES } from "../constants/movies"
import { mediaCopy } from "../titles/copy"
import { allowedSourceTypes } from "../titles/sources"
import type { MediaType } from "../titles/title"
import type { WatchlistSourceRef } from "../watchlists/combine"
import type { SourceType } from "../watchlists/sources"
import {
  defaultFilterPreferences,
  normalizePreferences,
  type FilterPreferences,
  type ProviderKey,
  type RatingStep,
  type SessionPreferences
} from "./preferences"
import type { MatchMode } from "./progress"

// Pure state for the shared session settings form (new-session page and the
// host's Session settings dialog). The component only renders this.

export interface SessionSettings {
  mediaType: MediaType
  matchMode: MatchMode
  preferences: SessionPreferences
}

export interface SettingsFormState {
  mediaType: MediaType
  matchMode: MatchMode
  poolMode: "filters" | "watchlists"
  genres: number[]
  providers: ProviderKey[]
  minRating: RatingStep
  minYear: string // as typed; blank = open
  maxYear: string
  sources: string[] // sourceKey(userId, sourceType)
}

const SOURCE_TYPES: readonly SourceType[] = ["trakt", "letterboxd"]
const SOURCE_LABELS: Record<SourceType, string> = {
  trakt: "Trakt",
  letterboxd: "Letterboxd"
}

export const sourceKey = (userId: string, sourceType: string) =>
  `${userId}:${sourceType}`

export function parseSourceKey(key: string): WatchlistSourceRef | null {
  const at = key.lastIndexOf(":")
  if (at <= 0) return null
  const sourceType = key.slice(at + 1)
  if (!(SOURCE_TYPES as readonly string[]).includes(sourceType)) return null
  return { userId: key.slice(0, at), sourceType: sourceType as SourceType }
}

const yearText = (year?: number) => (year === undefined ? "" : String(year))

export function initialFormState(initial: SessionSettings): SettingsFormState {
  const prefs = normalizePreferences(initial.preferences, initial.mediaType)
  const filters: FilterPreferences =
    prefs.mode === "filters" ? prefs : defaultFilterPreferences()
  return {
    mediaType: initial.mediaType,
    matchMode: initial.matchMode,
    poolMode: prefs.mode,
    genres: filters.genres,
    providers: filters.providers,
    minRating: filters.minRating,
    minYear: yearText(filters.minYear),
    maxYear: yearText(filters.maxYear),
    sources:
      prefs.mode === "watchlists"
        ? prefs.sources.map(s => sourceKey(s.userId, s.sourceType))
        : []
  }
}

const sourceAllowed = (key: string, mediaType: MediaType) => {
  const ref = parseSourceKey(key)
  return ref !== null && allowedSourceTypes(mediaType).includes(ref.sourceType)
}

// Genre ids differ between movies and TV, and Letterboxd only lists films
export function switchMediaType(
  state: SettingsFormState,
  mediaType: MediaType
): SettingsFormState {
  if (state.mediaType === mediaType) return state
  return {
    ...state,
    mediaType,
    genres: [],
    sources: state.sources.filter(key => sourceAllowed(key, mediaType))
  }
}

function parseYear(text: string): number | undefined {
  const year = Number.parseInt(text.trim(), 10)
  return Number.isFinite(year) ? year : undefined
}

// What the form submits. Normalized the same way the server will, so years
// get clamped and swapped here too.
export function toSettings(state: SettingsFormState): SessionSettings {
  const { mediaType, matchMode } = state
  if (state.poolMode === "watchlists") {
    return {
      mediaType,
      matchMode,
      preferences: {
        mode: "watchlists",
        sources: state.sources
          .filter(key => sourceAllowed(key, mediaType))
          .flatMap(key => parseSourceKey(key) ?? [])
      }
    }
  }
  const raw = {
    ...defaultFilterPreferences(),
    genres: state.genres,
    providers: state.providers,
    minRating: state.minRating,
    minYear: parseYear(state.minYear),
    maxYear: parseYear(state.maxYear)
  }
  return {
    mediaType,
    matchMode,
    preferences: normalizePreferences(raw, mediaType)
  }
}

// Earlier picks that are still on offer; with none, tick every list
export function initialSourceKeys(
  previous: readonly string[],
  available: readonly string[]
): string[] {
  const kept = previous.filter(key => available.includes(key))
  return kept.length > 0 ? kept : [...available]
}

export function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter(item => item !== value)
    : [...list, value]
}

// The YEAR_RANGES label matching the typed years, or "" for a custom range
export function yearPresetLabel(minYear: string, maxYear: string): string {
  const min = parseYear(minYear)
  const max = parseYear(maxYear)
  const preset = YEAR_RANGES.find(range =>
    range.value === null
      ? min === undefined && max === undefined
      : range.value.min === min && range.value.max === max
  )
  return preset?.label ?? ""
}

export function shortPoolMessage(poolSize: number, mediaType: MediaType) {
  const copy = mediaCopy(mediaType)
  return poolSize === 1
    ? `Only 1 ${copy.singular} matches`
    : `Only ${poolSize} ${copy.plural} match`
}

export function failedWatchlistNames(
  failed: readonly WatchlistSourceRef[],
  people: readonly { userId: string; name: string }[]
): string[] {
  const names = new Map(people.map(p => [p.userId, p.name]))
  return failed.map(f => {
    const name = names.get(f.userId) ?? "Someone"
    // getSessionWatchlistOptions calls the viewer "You"
    const owner = name === "You" ? "Your" : `${name}'s`
    return `${owner} ${SOURCE_LABELS[f.sourceType]}`
  })
}

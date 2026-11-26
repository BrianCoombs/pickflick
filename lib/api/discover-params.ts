import { providerIds } from "../constants/providers"
import type { FilterPreferences } from "../sessions/preferences"
import { TV_EXCLUDED_GENRES } from "../titles/genres"
import type { MediaType } from "../titles/title"

export interface DiscoverParamOptions {
  // One genre per call: each chosen genre is its own bucket in
  // buildBalancedPool. Left out for "any genre".
  genreId?: number
  page: number
  voteFloor: number
}

// Query string for GET /discover/{movie|tv}
export function buildDiscoverParams(
  mediaType: MediaType,
  prefs: FilterPreferences,
  { genreId, page, voteFloor }: DiscoverParamOptions
): Record<string, string> {
  const params: Record<string, string> = {
    sort_by: "popularity.desc",
    include_adult: "false",
    page: String(page),
    "vote_count.gte": String(voteFloor)
  }

  if (prefs.minRating > 0) {
    params["vote_average.gte"] = String(prefs.minRating)
  }

  if (genreId !== undefined) params.with_genres = String(genreId)
  if (mediaType === "tv") params.without_genres = TV_EXCLUDED_GENRES.join(",")

  const dateField =
    mediaType === "tv" ? "first_air_date" : "primary_release_date"
  if (prefs.minYear !== undefined) {
    params[`${dateField}.gte`] = `${prefs.minYear}-01-01`
  }
  if (prefs.maxYear !== undefined) {
    params[`${dateField}.lte`] = `${prefs.maxYear}-12-31`
  }

  // A pipe is OR in TMDb; a comma would be AND
  const ids = providerIds(prefs.providers)
  if (ids.length > 0) {
    params.with_watch_providers = ids.join("|")
    params.watch_region = prefs.region
    params.with_watch_monetization_types = "flatrate"
  }

  return params
}

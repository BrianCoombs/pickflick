import type { SourceType } from "../watchlists/sources"
import type { MediaType } from "./title"

const MOVIE_SOURCES: readonly SourceType[] = ["trakt", "letterboxd"]
const TV_SOURCES: readonly SourceType[] = ["trakt"]

// Letterboxd only lists films, so TV sessions can only use Trakt. Pass
// { letterboxd: letterboxdEnabled() } on the server so LETTERBOXD_ENABLED=false
// keeps it out of pools too, not just the UI.
export function allowedSourceTypes(
  mediaType: MediaType,
  { letterboxd = true }: { letterboxd?: boolean } = {}
): readonly SourceType[] {
  if (mediaType === "tv" || !letterboxd) return TV_SOURCES
  return MOVIE_SOURCES
}

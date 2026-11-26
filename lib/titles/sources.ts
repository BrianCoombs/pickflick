import type { SourceType } from "../watchlists/sources"
import type { MediaType } from "./title"

const MOVIE_SOURCES: readonly SourceType[] = ["trakt", "letterboxd"]
const TV_SOURCES: readonly SourceType[] = ["trakt"]

// Letterboxd only lists films, so TV sessions can only use Trakt
export function allowedSourceTypes(
  mediaType: MediaType
): readonly SourceType[] {
  return mediaType === "tv" ? TV_SOURCES : MOVIE_SOURCES
}

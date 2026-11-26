import type { MediaType } from "./title"

// Movie and TV ids are separate spaces (/movie/42009 isn't /tv/42009), so
// cache and React keys carry the media type
export function titleCacheKey(mediaType: MediaType, id: number | string) {
  return `${mediaType}:${id}`
}

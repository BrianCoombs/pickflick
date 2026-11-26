import { MOVIE_GENRES } from "../constants/movies"
import type { MediaType } from "./title"

// TMDb /genre/tv/list (checked 2026-11-25) minus News and Talk, which pools
// always exclude
export const TV_GENRES = [
  { id: 10759, name: "Action & Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 10762, name: "Kids" },
  { id: 9648, name: "Mystery" },
  { id: 10764, name: "Reality" },
  { id: 10765, name: "Sci-Fi & Fantasy" },
  { id: 10766, name: "Soap" },
  { id: 10768, name: "War & Politics" },
  { id: 37, name: "Western" }
] as const

// News, Talk: sent as without_genres on every TV discover call
export const TV_EXCLUDED_GENRES = [10763, 10767] as const

export type Genre = { readonly id: number; readonly name: string }

export function genresFor(mediaType: MediaType): readonly Genre[] {
  return mediaType === "tv" ? TV_GENRES : MOVIE_GENRES
}

// Keeps only genre ids the media type has, deduped, in their first order.
// Saved preferences are JSON, so numeric strings are accepted too
export function sanitizeGenres(
  mediaType: MediaType,
  ids: readonly unknown[] | null | undefined
): number[] {
  const allowed = new Set(genresFor(mediaType).map(g => g.id))
  const kept = new Set<number>()
  for (const raw of ids ?? []) {
    const id = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : raw
    if (typeof id === "number" && allowed.has(id)) kept.add(id)
  }
  return [...kept]
}

import { titleCacheKey } from "./cache"
import type { MediaType, Title } from "./title"

// Stands in for a pool title TMDb couldn't load, so the deck still has one
// card per pool id. Dropping it instead would leave the deck shorter than the
// server's pool, and nobody would ever count as done.
export function placeholderTitle(mediaType: MediaType, id: number): Title {
  return {
    mediaType,
    id,
    key: titleCacheKey(mediaType, id),
    name: `Tape #${id}`,
    overview: "",
    posterPath: null,
    backdropPath: null,
    year: null,
    genres: [],
    rating: 0,
    voteCount: 0,
    runtimeMinutes: null,
    seasons: null,
    episodes: null,
    tagline: null,
    trailerUrl: null,
    providers: []
  }
}

// Loads every pool title in pool order, `limit` at a time, with a placeholder
// for any that fail. Always returns exactly one title per id.
export async function loadTitlesInOrder(
  mediaType: MediaType,
  ids: number[],
  load: (mediaType: MediaType, id: number) => Promise<Title>,
  limit = 8
): Promise<Title[]> {
  const titles: Title[] = new Array(ids.length)
  let next = 0

  const worker = async () => {
    while (next < ids.length) {
      const index = next++
      const id = ids[index]
      try {
        titles[index] = await load(mediaType, id)
      } catch (error) {
        console.error(`Couldn't load ${titleCacheKey(mediaType, id)}:`, error)
        titles[index] = placeholderTitle(mediaType, id)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, limit), ids.length) }, worker)
  )
  return titles
}

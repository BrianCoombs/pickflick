import { shuffle } from "../shuffle"

export { shuffle }

// Union of every list, de-duplicated, minus excluded ids (already in the
// pool), shuffled and cut to size
export function buildWatchlistPool(
  lists: number[][],
  size: number,
  random: () => number = Math.random,
  exclude: Iterable<number> = []
): number[] {
  const skip = new Set(exclude)
  const ids = Array.from(new Set(lists.flat())).filter(id => !skip.has(id))
  return shuffle(ids, random).slice(0, size)
}

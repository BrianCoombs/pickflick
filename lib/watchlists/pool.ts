import { shuffle } from "../shuffle"

export { shuffle }

// Union of every list, de-duplicated, shuffled and cut to size
export function buildWatchlistPool(
  lists: number[][],
  size: number,
  random: () => number = Math.random
): number[] {
  return shuffle(Array.from(new Set(lists.flat())), random).slice(0, size)
}

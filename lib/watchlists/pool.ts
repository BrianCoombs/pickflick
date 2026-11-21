// Union of every list, de-duplicated, shuffled and cut to size
export function buildWatchlistPool(
  lists: number[][],
  size: number,
  random: () => number = Math.random
): number[] {
  const ids = Array.from(new Set(lists.flat()))

  // Fisher-Yates shuffle
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }

  return ids.slice(0, size)
}

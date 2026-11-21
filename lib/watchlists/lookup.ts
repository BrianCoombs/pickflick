// Runs `lookup` over items, `limit` at a time, until the deadline. Items whose
// lookup throws are skipped; a fatal error (e.g. the site blocking us) stops
// new lookups. Whatever was found is returned either way
export async function lookupAll<T, R>(
  items: T[],
  limit: number,
  deadline: number,
  lookup: (item: T) => Promise<R>,
  isFatal: (error: unknown) => boolean
): Promise<{ results: Map<T, R>; stopped: boolean }> {
  const results = new Map<T, R>()
  let stopped = false
  let next = 0

  const worker = async () => {
    while (!stopped && next < items.length && Date.now() < deadline) {
      const item = items[next++]
      try {
        results.set(item, await lookup(item))
      } catch (error) {
        if (isFatal(error)) stopped = true
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  )
  return { results, stopped }
}

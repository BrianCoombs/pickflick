export interface PageResult {
  ids: number[]
  totalPages: number
}

export interface BalancedPoolOptions {
  // One bucket per chosen genre (or a single bucket for "any genre")
  bucketCount: number
  // Loads one page (1-based) of one bucket, e.g. a TMDb discover call
  fetchPage: (bucket: number, page: number) => Promise<PageResult>
  size: number
  exclude?: Iterable<number>
  maxPagesPerBucket: number
}

interface BucketState {
  queue: number[]
  nextPage: number
  lastPage: number
  done: boolean
}

// Takes one id from each bucket in turn so every genre gets an equal share.
// A bucket that runs out leaves the others to fill the gap. Pages load only
// when a bucket's queue is empty. Ids already taken or excluded are skipped.
// `exhausted` means every bucket ran out before the pool reached `size`.
export async function buildBalancedPool({
  bucketCount,
  fetchPage,
  size,
  exclude = [],
  maxPagesPerBucket
}: BalancedPoolOptions): Promise<{ ids: number[]; exhausted: boolean }> {
  const ids: number[] = []
  if (size <= 0) return { ids, exhausted: false }

  const seen = new Set(exclude)
  const buckets: BucketState[] = Array.from({ length: bucketCount }, () => ({
    queue: [],
    nextPage: 1,
    lastPage: Math.max(0, maxPagesPerBucket),
    done: false
  }))

  const loadNextPage = async (b: number) => {
    const bucket = buckets[b]
    if (bucket.nextPage > bucket.lastPage) {
      bucket.done = true
      return
    }
    const page = await fetchPage(b, bucket.nextPage)
    bucket.nextPage++
    bucket.lastPage = Math.min(bucket.lastPage, page.totalPages)
    bucket.queue.push(...page.ids)
  }

  // Next unseen id from bucket b, or undefined once the bucket is used up
  const takeFrom = async (b: number): Promise<number | undefined> => {
    const bucket = buckets[b]
    while (!bucket.done) {
      while (bucket.queue.length > 0) {
        const id = bucket.queue.shift()!
        if (!seen.has(id)) return id
      }
      await loadNextPage(b)
    }
    return undefined
  }

  // Every bucket needs its first page, so load those together
  await Promise.all(buckets.map((_, b) => loadNextPage(b)))

  while (ids.length < size && buckets.some(b => !b.done)) {
    for (let b = 0; b < bucketCount && ids.length < size; b++) {
      const id = await takeFrom(b)
      if (id === undefined) continue
      seen.add(id)
      ids.push(id)
    }
  }

  return { ids, exhausted: ids.length < size }
}

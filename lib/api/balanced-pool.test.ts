import assert from "node:assert/strict"
import { test } from "node:test"
import { buildBalancedPool, type PageResult } from "./balanced-pool"

// A fake discover: bucket b holds `sizes[b]` ids starting at (b + 1) * 1000,
// served 20 per page. Every call is recorded as "bucket:page".
function fakeDiscover(buckets: number[][], perPage = 20) {
  const calls: string[] = []
  const fetchPage = async (
    bucket: number,
    page: number
  ): Promise<PageResult> => {
    calls.push(`${bucket}:${page}`)
    const all = buckets[bucket]
    const totalPages = Math.max(1, Math.ceil(all.length / perPage))
    return {
      ids: all.slice((page - 1) * perPage, page * perPage),
      totalPages
    }
  }
  return { calls, fetchPage }
}

const range = (start: number, count: number) =>
  Array.from({ length: count }, (_, i) => start + i)

const bucketOf = (id: number) => Math.floor(id / 1000) - 1

test("takes an equal share from each bucket", async () => {
  const { fetchPage } = fakeDiscover([
    range(1000, 200),
    range(2000, 200),
    range(3000, 200)
  ])
  const { ids, exhausted } = await buildBalancedPool({
    bucketCount: 3,
    fetchPage,
    size: 51,
    maxPagesPerBucket: 5
  })
  assert.equal(ids.length, 51)
  assert.equal(exhausted, false)
  const counts = [0, 0, 0]
  ids.forEach(id => counts[bucketOf(id)]++)
  assert.deepEqual(counts, [17, 17, 17])
})

test("lets the other buckets fill in for a short one", async () => {
  const { fetchPage } = fakeDiscover([
    range(1000, 200),
    range(2000, 5),
    range(3000, 200)
  ])
  const { ids, exhausted } = await buildBalancedPool({
    bucketCount: 3,
    fetchPage,
    size: 50,
    maxPagesPerBucket: 5
  })
  assert.equal(ids.length, 50)
  assert.equal(exhausted, false)
  range(2000, 5).forEach(id => assert.ok(ids.includes(id)))
  assert.equal(new Set(ids).size, 50)
})

test("includes an id from two buckets once", async () => {
  const { fetchPage } = fakeDiscover([
    [1, 2, 3],
    [3, 4, 5]
  ])
  const { ids } = await buildBalancedPool({
    bucketCount: 2,
    fetchPage,
    size: 50,
    maxPagesPerBucket: 5
  })
  assert.deepEqual(
    [...ids].sort((a, b) => a - b),
    [1, 2, 3, 4, 5]
  )
})

test("never includes an excluded id", async () => {
  const { fetchPage } = fakeDiscover([range(1000, 60), range(2000, 60)])
  const exclude = [1000, 1001, 2005, 2059]
  const { ids } = await buildBalancedPool({
    bucketCount: 2,
    fetchPage,
    size: 50,
    exclude,
    maxPagesPerBucket: 5
  })
  assert.equal(ids.length, 50)
  exclude.forEach(id => assert.ok(!ids.includes(id)))
})

test("returns every unique id and says so when all buckets run short", async () => {
  const { fetchPage } = fakeDiscover([
    range(1000, 7),
    range(2000, 3),
    [1000, 2000, 9]
  ])
  const { ids, exhausted } = await buildBalancedPool({
    bucketCount: 3,
    fetchPage,
    size: 50,
    maxPagesPerBucket: 5
  })
  assert.equal(ids.length, 11)
  assert.equal(new Set(ids).size, 11)
  assert.equal(exhausted, true)
})

test("never asks for a page past total_pages", async () => {
  const { calls, fetchPage } = fakeDiscover([range(1000, 45)])
  await buildBalancedPool({
    bucketCount: 1,
    fetchPage,
    size: 100,
    maxPagesPerBucket: 10
  })
  assert.deepEqual(calls, ["0:1", "0:2", "0:3"])
})

test("never asks for more than maxPagesPerBucket pages", async () => {
  const { calls, fetchPage } = fakeDiscover([range(1000, 500)])
  const { ids, exhausted } = await buildBalancedPool({
    bucketCount: 1,
    fetchPage,
    size: 100,
    maxPagesPerBucket: 2
  })
  assert.deepEqual(calls, ["0:1", "0:2"])
  assert.equal(ids.length, 40)
  assert.equal(exhausted, true)
})

test("loads pages only when it needs them", async () => {
  const { calls, fetchPage } = fakeDiscover([
    range(1000, 200),
    range(2000, 200),
    range(3000, 200)
  ])
  await buildBalancedPool({
    bucketCount: 3,
    fetchPage,
    size: 30,
    maxPagesPerBucket: 5
  })
  assert.deepEqual([...calls].sort(), ["0:1", "1:1", "2:1"])
})

test("pages on into a bucket whose first page was all excluded", async () => {
  const { calls, fetchPage } = fakeDiscover([range(1000, 40)])
  const { ids } = await buildBalancedPool({
    bucketCount: 1,
    fetchPage,
    size: 5,
    exclude: range(1000, 20),
    maxPagesPerBucket: 5
  })
  assert.deepEqual(ids, range(1020, 5))
  assert.deepEqual(calls, ["0:1", "0:2"])
})

test("returns nothing when there are no buckets", async () => {
  const { ids, exhausted } = await buildBalancedPool({
    bucketCount: 0,
    fetchPage: async () => ({ ids: [1], totalPages: 1 }),
    size: 50,
    maxPagesPerBucket: 5
  })
  assert.deepEqual(ids, [])
  assert.equal(exhausted, true)
})

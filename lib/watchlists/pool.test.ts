import assert from "node:assert/strict"
import { test } from "node:test"
import { buildWatchlistPool } from "./pool"

test("includes a movie on several lists only once", () => {
  const pool = buildWatchlistPool(
    [
      [1, 2],
      [2, 3]
    ],
    50
  )
  assert.deepEqual([...pool].sort(), [1, 2, 3])
})

test("caps the pool at the requested size", () => {
  const big = Array.from({ length: 300 }, (_, i) => i + 1)
  const pool = buildWatchlistPool([big, [301]], 50)
  assert.equal(pool.length, 50)
  assert.equal(new Set(pool).size, 50)
  pool.forEach(id => assert.ok(id >= 1 && id <= 301))
})

test("returns an empty pool when every list is empty", () => {
  assert.deepEqual(buildWatchlistPool([[], []], 50), [])
})

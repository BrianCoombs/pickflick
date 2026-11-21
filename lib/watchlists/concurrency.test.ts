import assert from "node:assert/strict"
import { test } from "node:test"
import { mapWithConcurrency } from "./concurrency"

test("maps every item in order while running at most `limit` at once", async () => {
  let running = 0
  let peak = 0
  const result = await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async n => {
    running++
    peak = Math.max(peak, running)
    await new Promise(r => setTimeout(r, 5))
    running--
    return n * 10
  })
  assert.deepEqual(result, [10, 20, 30, 40, 50, 60, 70])
  assert.equal(peak, 3)
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { lookupAll } from "./lookup"

const blocked = new Error("blocked")
const isFatal = (e: unknown) => e === blocked

test("keeps results found before a fatal error and stops starting new lookups", async () => {
  const started: number[] = []
  const { results, stopped } = await lookupAll(
    [1, 2, 3, 4, 5, 6],
    1,
    Date.now() + 10_000,
    async n => {
      started.push(n)
      if (n === 3) throw blocked
      return n * 10
    },
    isFatal
  )
  assert.deepEqual(
    [...results.entries()],
    [
      [1, 10],
      [2, 20]
    ]
  )
  assert.equal(stopped, true)
  assert.deepEqual(started, [1, 2, 3])
})

test("skips an item whose lookup fails for an ordinary reason", async () => {
  const { results, stopped } = await lookupAll(
    ["a", "b"],
    2,
    Date.now() + 10_000,
    async s => {
      if (s === "a") throw new Error("timeout")
      return s.toUpperCase()
    },
    isFatal
  )
  assert.deepEqual([...results.entries()], [["b", "B"]])
  assert.equal(stopped, false)
})

test("starts nothing after the deadline", async () => {
  const { results } = await lookupAll(
    [1, 2],
    1,
    Date.now() - 1,
    async n => n,
    isFatal
  )
  assert.equal(results.size, 0)
})

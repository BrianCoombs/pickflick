import assert from "node:assert/strict"
import { test } from "node:test"
import { combineWatchlistResults } from "./combine"

const sam = { userId: "sam", sourceType: "letterboxd" as const }
const ana = { userId: "ana", sourceType: "trakt" as const }

test("one failed list doesn't stop the others", () => {
  const { movieIds, failed } = combineWatchlistResults(
    [
      { source: sam, error: new Error("private") },
      { source: ana, ids: [10, 20] }
    ],
    50
  )
  assert.deepEqual([...movieIds].sort(), [10, 20])
  assert.deepEqual(failed, [sam])
})

test("reports every source when all of them fail", () => {
  const { movieIds, failed } = combineWatchlistResults(
    [
      { source: sam, error: new Error("blocked") },
      { source: ana, error: new Error("revoked") }
    ],
    50
  )
  assert.deepEqual(movieIds, [])
  assert.deepEqual(failed, [sam, ana])
})

test("an empty list is not a failure", () => {
  const { movieIds, failed } = combineWatchlistResults(
    [{ source: ana, ids: [] }],
    50
  )
  assert.deepEqual(movieIds, [])
  assert.deepEqual(failed, [])
})

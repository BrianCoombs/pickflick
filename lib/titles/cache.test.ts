import assert from "node:assert/strict"
import { test } from "node:test"
import { titleCacheKey } from "./cache"

test("cache keys carry the media type", () => {
  assert.equal(titleCacheKey("movie", 603), "movie:603")
  assert.equal(titleCacheKey("tv", 42009), "tv:42009")
})

test("string ids from the stored pool give the same key", () => {
  assert.equal(titleCacheKey("tv", "42009"), "tv:42009")
})

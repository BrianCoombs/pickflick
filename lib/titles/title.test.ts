import assert from "node:assert/strict"
import { test } from "node:test"
import { parseMediaType } from "./title"

test("parses tv", () => {
  assert.equal(parseMediaType("tv"), "tv")
})

test("anything else is a movie", () => {
  for (const value of ["movie", undefined, null, "TV", "film", 3, {}, ""]) {
    assert.equal(parseMediaType(value), "movie")
  }
})

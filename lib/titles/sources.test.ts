import assert from "node:assert/strict"
import { test } from "node:test"
import { allowedSourceTypes } from "./sources"

test("movies can use Trakt and Letterboxd", () => {
  assert.deepEqual(allowedSourceTypes("movie"), ["trakt", "letterboxd"])
})

test("TV uses Trakt only (Letterboxd is films only)", () => {
  assert.deepEqual(allowedSourceTypes("tv"), ["trakt"])
})

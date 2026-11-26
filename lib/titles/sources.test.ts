import assert from "node:assert/strict"
import { test } from "node:test"
import { allowedSourceTypes } from "./sources"

test("movies can use Trakt and Letterboxd", () => {
  assert.deepEqual(allowedSourceTypes("movie"), ["trakt", "letterboxd"])
})

test("TV uses Trakt only (Letterboxd is films only)", () => {
  assert.deepEqual(allowedSourceTypes("tv"), ["trakt"])
})

test("with Letterboxd switched off, movies use Trakt only", () => {
  assert.deepEqual(allowedSourceTypes("movie", { letterboxd: false }), [
    "trakt"
  ])
  assert.deepEqual(allowedSourceTypes("tv", { letterboxd: false }), ["trakt"])
})

test("Letterboxd on is the same as the default", () => {
  assert.deepEqual(allowedSourceTypes("movie", { letterboxd: true }), [
    "trakt",
    "letterboxd"
  ])
})

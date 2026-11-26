import assert from "node:assert/strict"
import { test } from "node:test"
import { MOVIE_GENRES } from "../constants/movies"
import {
  genresFor,
  sanitizeGenres,
  TV_EXCLUDED_GENRES,
  TV_GENRES
} from "./genres"

test("TV genres are TMDb's list without News and Talk", () => {
  const tv = genresFor("tv")
  assert.equal(tv, TV_GENRES)
  assert.equal(tv.length, 14)
  const ids: number[] = tv.map(g => g.id)
  assert.deepEqual([...TV_EXCLUDED_GENRES], [10763, 10767])
  for (const excluded of TV_EXCLUDED_GENRES) {
    assert.equal(ids.includes(excluded), false)
  }
  assert.equal(new Set(ids).size, ids.length)
})

test("movie genres are the existing movie list", () => {
  assert.equal(genresFor("movie"), MOVIE_GENRES)
})

test("drops genres the media type doesn't have", () => {
  assert.deepEqual(sanitizeGenres("tv", [28, 35, 10765]), [35, 10765])
  assert.deepEqual(sanitizeGenres("movie", [10765, 28]), [28])
  assert.deepEqual(sanitizeGenres("tv", [10763, 10767, 18]), [18])
})

test("dedupes and keeps order", () => {
  assert.deepEqual(sanitizeGenres("movie", [35, 28, 35, 28]), [35, 28])
})

test("tolerates empty and junk input", () => {
  assert.deepEqual(sanitizeGenres("movie", []), [])
  assert.deepEqual(sanitizeGenres("movie", null), [])
  assert.deepEqual(sanitizeGenres("movie", undefined), [])
  assert.deepEqual(
    sanitizeGenres("movie", ["28", "x", null, 1.5, 35]),
    [28, 35]
  )
})

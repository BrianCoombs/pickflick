import assert from "node:assert/strict"
import { test } from "node:test"
import {
  defaultFilterPreferences,
  describePreferences,
  normalizePreferences,
  type FilterPreferences
} from "./preferences"

const defaults: FilterPreferences = {
  version: 2,
  mode: "filters",
  genres: [],
  minRating: 6,
  providers: [],
  region: "US"
}

const nextYear = new Date().getFullYear() + 1

test("empty input gives the default filters", () => {
  assert.deepEqual(normalizePreferences({}, "movie"), defaults)
  assert.deepEqual(normalizePreferences(null, "movie"), defaults)
  assert.deepEqual(normalizePreferences(undefined, "tv"), defaults)
  assert.deepEqual(normalizePreferences("junk", "movie"), defaults)
  assert.deepEqual(defaultFilterPreferences(), defaults)
})

test("the defaults are a fresh copy each time", () => {
  const a = normalizePreferences(null, "movie") as FilterPreferences
  a.genres.push(28)
  assert.deepEqual(normalizePreferences(null, "movie"), defaults)
})

test("an old filter preference keeps its values and becomes version 2", () => {
  assert.deepEqual(
    normalizePreferences(
      { genres: [28], minYear: 1990, maxYear: 1999, minRating: 6 },
      "movie"
    ),
    { ...defaults, genres: [28], minYear: 1990, maxYear: 1999 }
  )
})

test("an old preference without genres keeps its years", () => {
  assert.deepEqual(
    normalizePreferences(
      { minYear: 2000, maxYear: 2010, minRating: 7 },
      "movie"
    ),
    { ...defaults, minYear: 2000, maxYear: 2010, minRating: 7 }
  )
})

test("watchlist preferences pass through, minus bad sources", () => {
  assert.deepEqual(
    normalizePreferences(
      {
        mode: "watchlists",
        sources: [
          { userId: "u1", sourceType: "trakt" },
          { userId: "u2", sourceType: "letterboxd" },
          { userId: "u3", sourceType: "imdb" },
          { sourceType: "trakt" },
          "junk"
        ]
      },
      "movie"
    ),
    {
      mode: "watchlists",
      sources: [
        { userId: "u1", sourceType: "trakt" },
        { userId: "u2", sourceType: "letterboxd" }
      ]
    }
  )
  assert.deepEqual(normalizePreferences({ mode: "watchlists" }, "movie"), {
    mode: "watchlists",
    sources: []
  })
})

test("keeps only genres the media type has", () => {
  const movie = normalizePreferences({ genres: [10765, 28] }, "movie")
  assert.deepEqual((movie as FilterPreferences).genres, [28])
  const tv = normalizePreferences({ genres: [10765, 28] }, "tv")
  assert.deepEqual((tv as FilterPreferences).genres, [10765])
})

test("removes duplicate genres", () => {
  const p = normalizePreferences({ genres: [28, 27, 28] }, "movie")
  assert.deepEqual((p as FilterPreferences).genres, [28, 27])
})

test("snaps the rating down to a step", () => {
  const rating = (minRating: unknown) =>
    (normalizePreferences({ minRating }, "movie") as FilterPreferences)
      .minRating
  assert.equal(rating(6.5), 6)
  assert.equal(rating(7.9), 7)
  assert.equal(rating(3), 0)
  assert.equal(rating(0), 0)
  assert.equal(rating(9), 8)
  assert.equal(rating("high"), 6)
  assert.equal(rating(Number.NaN), 6)
})

test("clamps years and swaps them when they're backwards", () => {
  const years = (raw: object) => {
    const p = normalizePreferences(raw, "movie") as FilterPreferences
    return [p.minYear, p.maxYear]
  }
  assert.deepEqual(years({ minYear: 1800, maxYear: 1950 }), [1900, 1950])
  assert.deepEqual(years({ minYear: 1990, maxYear: 3000 }), [1990, nextYear])
  assert.deepEqual(years({ minYear: 2010, maxYear: 1990 }), [1990, 2010])
  assert.deepEqual(years({ minYear: "x", maxYear: null }), [
    undefined,
    undefined
  ])
  assert.deepEqual(years({ minYear: 1995.7 }), [1995, undefined])
})

test("leaves out years that weren't set", () => {
  const p = normalizePreferences({ genres: [] }, "movie")
  assert.equal("minYear" in p, false)
  assert.equal("maxYear" in p, false)
})

test("drops unknown and repeated providers", () => {
  const p = normalizePreferences(
    { providers: ["netflix", "tubi", "hulu", "netflix", 8] },
    "movie"
  )
  assert.deepEqual((p as FilterPreferences).providers, ["netflix", "hulu"])
})

test("always uses the US region", () => {
  const p = normalizePreferences({ region: "GB" }, "movie")
  assert.equal((p as FilterPreferences).region, "US")
})

test("describes the defaults", () => {
  assert.deepEqual(describePreferences(defaults, "movie"), [
    "Any genre",
    "6+ rating"
  ])
  assert.deepEqual(
    describePreferences({ ...defaults, minRating: 0 }, "movie"),
    ["Any genre"]
  )
})

test("describes full filters", () => {
  assert.deepEqual(
    describePreferences(
      {
        ...defaults,
        genres: [28, 27],
        minYear: 1990,
        maxYear: 1999,
        minRating: 7,
        providers: ["netflix", "hulu"]
      },
      "movie"
    ),
    ["Action, Horror", "1990–1999", "7+ rating", "Netflix, Hulu"]
  )
})

test("describes open-ended year ranges", () => {
  assert.deepEqual(
    describePreferences({ ...defaults, minYear: 1990 }, "movie"),
    ["Any genre", "1990 or later", "6+ rating"]
  )
  assert.deepEqual(
    describePreferences({ ...defaults, maxYear: 1999, minRating: 0 }, "movie"),
    ["Any genre", "Up to 1999"]
  )
  assert.deepEqual(
    describePreferences(
      { ...defaults, minYear: 2001, maxYear: 2001, minRating: 0 },
      "movie"
    ),
    ["Any genre", "2001"]
  )
})

test("uses TV genre names for TV", () => {
  assert.deepEqual(
    describePreferences({ ...defaults, genres: [10765], minRating: 0 }, "tv"),
    ["Sci-Fi & Fantasy"]
  )
})

test("describes watchlist preferences", () => {
  assert.deepEqual(
    describePreferences(
      {
        mode: "watchlists",
        sources: [
          { userId: "u1", sourceType: "trakt" },
          { userId: "u2", sourceType: "letterboxd" }
        ]
      },
      "movie"
    ),
    ["From watchlists", "2 lists"]
  )
  assert.deepEqual(
    describePreferences(
      { mode: "watchlists", sources: [{ userId: "u1", sourceType: "trakt" }] },
      "movie"
    ),
    ["From watchlists", "1 list"]
  )
})

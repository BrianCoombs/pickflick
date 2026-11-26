import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import { extractTraktTmdbIds, traktHeaders, traktWatchlistPath } from "./trakt"

process.env.TRAKT_CLIENT_ID = "test-client-id"

test("identifies the app with a User-Agent, which Trakt's firewall requires", () => {
  const headers = traktHeaders() as Record<string, string>
  assert.match(headers["User-Agent"], /^PickFlick\/\d/)
  assert.equal(headers["trakt-api-key"], "test-client-id")
  assert.equal(headers["trakt-api-version"], "2")
})

test("adds the bearer token when given one", () => {
  const headers = traktHeaders("abc") as Record<string, string>
  assert.equal(headers.Authorization, "Bearer abc")
})

test("reads the movie or show watchlist depending on the media type", () => {
  assert.equal(traktWatchlistPath("movie"), "/sync/watchlist/movies")
  assert.equal(traktWatchlistPath("tv"), "/sync/watchlist/shows")
})

// Trakt's documented /sync/watchlist/shows shape
const shows = JSON.parse(
  readFileSync(
    join(__dirname, "__fixtures__", "trakt-watchlist-shows.json"),
    "utf8"
  )
)

test("pulls TMDb ids from a shows watchlist, dropping shows without one", () => {
  assert.deepEqual(extractTraktTmdbIds(shows, "tv"), [1396, 1399])
})

test("reads .movie for movies and ignores shows", () => {
  const items = [
    { type: "movie", movie: { ids: { tmdb: 603 } } },
    { type: "movie", movie: { ids: { tmdb: null } } },
    { type: "movie", movie: { ids: {} } },
    { type: "show", show: { ids: { tmdb: 1399 } } }
  ]
  assert.deepEqual(extractTraktTmdbIds(items, "movie"), [603])
  assert.deepEqual(extractTraktTmdbIds(items, "tv"), [1399])
})

test("ignores an item whose type says the other kind", () => {
  const items = [{ type: "movie", show: { ids: { tmdb: 1 } } }]
  assert.deepEqual(extractTraktTmdbIds(items, "tv"), [])
})

test("copes with junk instead of a list", () => {
  assert.deepEqual(extractTraktTmdbIds(null, "movie"), [])
  assert.deepEqual(extractTraktTmdbIds([null, 3, "x"], "tv"), [])
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  extractTraktTmdbIds,
  getTraktWatchlistTmdbIds,
  traktHeaders,
  traktWatchlistPath
} from "./trakt"

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

// A fake Trakt: pages of watchlist items, with the pagination headers Trakt
// sends (checked against api.trakt.tv on 2026-11-25: 100 per page by default,
// up to 250 with ?limit=250)
function fakeTrakt(kind: "show" | "movie", total: number) {
  const calls: string[] = []
  const original = globalThis.fetch
  globalThis.fetch = (async (input: string | URL) => {
    const url = new URL(String(input))
    calls.push(url.pathname + url.search)
    const limit = Number(url.searchParams.get("limit") ?? 100)
    const page = Number(url.searchParams.get("page") ?? 1)
    const pageCount = Math.max(1, Math.ceil(total / limit))
    const start = (page - 1) * limit
    const items = Array.from(
      { length: Math.max(0, Math.min(limit, total - start)) },
      (_, i) => ({ type: kind, [kind]: { ids: { tmdb: start + i + 1 } } })
    )
    return new Response(JSON.stringify(items), {
      status: 200,
      headers: {
        "x-pagination-page": String(page),
        "x-pagination-page-count": String(pageCount),
        "x-pagination-limit": String(limit)
      }
    })
  }) as typeof fetch
  return { calls, restore: () => (globalThis.fetch = original) }
}

test("a TV session reads the shows watchlist, a movie session the movies one", async () => {
  const tv = fakeTrakt("show", 3)
  try {
    assert.deepEqual(await getTraktWatchlistTmdbIds("t", "tv"), [1, 2, 3])
    assert.ok(tv.calls.every(c => c.startsWith("/sync/watchlist/shows")))
  } finally {
    tv.restore()
  }
  const movies = fakeTrakt("movie", 2)
  try {
    assert.deepEqual(await getTraktWatchlistTmdbIds("t", "movie"), [1, 2])
    assert.ok(movies.calls.every(c => c.startsWith("/sync/watchlist/movies")))
  } finally {
    movies.restore()
  }
})

test("reads every page of a long watchlist, not just the first 100", async () => {
  const fake = fakeTrakt("movie", 600)
  try {
    const ids = await getTraktWatchlistTmdbIds("t", "movie")
    assert.equal(ids.length, 600)
    assert.equal(new Set(ids).size, 600)
    assert.equal(fake.calls.length, 3) // 250 + 250 + 100
  } finally {
    fake.restore()
  }
})

test("stops at a sane number of pages for a huge watchlist", async () => {
  const fake = fakeTrakt("show", 100_000)
  try {
    const ids = await getTraktWatchlistTmdbIds("t", "tv")
    assert.ok(fake.calls.length <= 20)
    assert.equal(ids.length, fake.calls.length * 250)
  } finally {
    fake.restore()
  }
})

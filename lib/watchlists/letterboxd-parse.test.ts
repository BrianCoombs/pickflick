import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  filmLookup,
  isWatchlistPage,
  normalizeLetterboxdUsername,
  parseFilmTmdbId,
  parseWatchlistPageCount,
  parseWatchlistSlugs
} from "./letterboxd-parse"

const fixture = (name: string) =>
  readFileSync(join(__dirname, "__fixtures__", name), "utf8")

test("parses every film slug on a watchlist page", () => {
  const slugs = parseWatchlistSlugs(fixture("watchlist-page.html"))
  assert.equal(slugs.length, 28)
  assert.equal(slugs[0], "la-gradiva")
  assert.equal(new Set(slugs).size, slugs.length)
})

test("returns no slugs for a page past the end of the watchlist", () => {
  assert.deepEqual(parseWatchlistSlugs(fixture("watchlist-empty.html")), [])
})

test("recognises a watchlist page by its title", () => {
  assert.equal(isWatchlistPage(fixture("watchlist-page.html")), true)
  assert.equal(isWatchlistPage(fixture("watchlist-empty.html")), true)
  assert.equal(isWatchlistPage(fixture("film-page.html")), false)
})

test("reads the TMDb id from a film page", () => {
  assert.equal(parseFilmTmdbId(fixture("film-page.html")), 496243)
})

test("returns null when a film page has no TMDb id", () => {
  assert.equal(parseFilmTmdbId("<html><body></body></html>"), null)
})

test("accepts a username typed plainly, with @, or as a profile link", () => {
  assert.equal(normalizeLetterboxdUsername("Dave"), "dave")
  assert.equal(normalizeLetterboxdUsername(" @dave "), "dave")
  assert.equal(
    normalizeLetterboxdUsername("https://letterboxd.com/dave/watchlist/"),
    "dave"
  )
  assert.equal(
    normalizeLetterboxdUsername("letterboxd.com/some_user"),
    "some_user"
  )
})

test("rejects text that can't be a Letterboxd username", () => {
  assert.equal(normalizeLetterboxdUsername(""), null)
  assert.equal(normalizeLetterboxdUsername("dave/../../admin"), null)
  assert.equal(normalizeLetterboxdUsername("has space"), null)
})

test("reads the number of watchlist pages from the pagination", () => {
  assert.equal(parseWatchlistPageCount(fixture("watchlist-page.html")), 22)
})

test("treats a page without pagination as the only page", () => {
  const singlePage =
    "<html><head><title>Sam’s Watchlist • Letterboxd</title></head><body></body></html>"
  assert.equal(parseWatchlistPageCount(singlePage), 1)
})

test("ignores TMDb ids for TV entries, whose ids overlap with movies", () => {
  const tvPage =
    '<html><body data-tmdb-type="tv" data-tmdb-id="1396"></body></html>'
  assert.equal(parseFilmTmdbId(tvPage), null)
})

test("caches a film page's result only when Letterboxd answered normally", () => {
  const film = fixture("film-page.html")
  assert.deepEqual(filmLookup(200, film), { cache: true, tmdbId: 496243 })
  assert.deepEqual(filmLookup(200, "<html></html>"), {
    cache: true,
    tmdbId: null
  })
  assert.deepEqual(filmLookup(503, ""), { cache: false, tmdbId: null })
  assert.deepEqual(filmLookup(404, ""), { cache: false, tmdbId: null })
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  isWatchlistPage,
  parseFilmTmdbId,
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

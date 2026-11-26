import assert from "node:assert/strict"
import { test } from "node:test"
import { boxBackLine, cardMetaLine, titlesForIds } from "./card"
import type { Title } from "./title"

const title = (overrides: Partial<Title> = {}): Title => ({
  mediaType: "movie",
  id: 550,
  key: "movie:550",
  name: "Fight Club",
  overview: "",
  posterPath: null,
  backdropPath: null,
  year: 1999,
  genres: [
    { id: 18, name: "Drama" },
    { id: 53, name: "Thriller" }
  ],
  rating: 8.4,
  voteCount: 1000,
  runtimeMinutes: 139,
  seasons: null,
  episodes: null,
  tagline: null,
  trailerUrl: null,
  providers: [],
  ...overrides
})

test("card meta: year, first genre and runtime", () => {
  assert.equal(cardMetaLine(title()), "1999 · Drama · 2h 19m")
})

test("card meta: TV shows seasons and episodes", () => {
  const show = title({
    mediaType: "tv",
    key: "tv:1399",
    runtimeMinutes: 60,
    seasons: 5,
    episodes: 62
  })
  assert.equal(cardMetaLine(show), "1999 · Drama · 5 seasons · 62 episodes")
})

test("card meta: skips what isn't known", () => {
  assert.equal(
    cardMetaLine(title({ year: null, genres: [], runtimeMinutes: 0 })),
    ""
  )
  assert.equal(cardMetaLine(title({ genres: [] })), "1999 · 2h 19m")
})

test("back of the box lists every genre", () => {
  assert.equal(boxBackLine(title()), "1999 · Drama, Thriller · 2h 19m")
  assert.equal(boxBackLine(title({ genres: [], year: null })), "2h 19m")
})

test("titlesForIds keeps the ids' order and skips unloaded ones", () => {
  const a = title({ id: 1, key: "movie:1" })
  const b = title({ id: 2, key: "movie:2" })
  const c = title({ id: 3, key: "movie:3" })
  assert.deepEqual(
    titlesForIds([a, b, c], ["3", "1", "99"]).map(t => t.id),
    [3, 1]
  )
  assert.deepEqual(
    titlesForIds([a, b], [2, "2"]).map(t => t.id),
    [2]
  )
  assert.deepEqual(titlesForIds([a], []), [])
})

import assert from "node:assert/strict"
import { test } from "node:test"
import { mediaCopy } from "./copy"

test("both media types have every key, none empty", () => {
  const movie = mediaCopy("movie")
  const tv = mediaCopy("tv")
  assert.deepEqual(Object.keys(tv).sort(), Object.keys(movie).sort())
  for (const copy of [movie, tv]) {
    for (const [key, value] of Object.entries(copy)) {
      assert.ok(value.trim().length > 0, `${key} is empty`)
    }
  }
})

// Strings the app shows today; the movie copy must not change
test("movie copy matches today's app", () => {
  assert.deepEqual(mediaCopy("movie"), {
    plural: "movies",
    singular: "movie",
    outOf: "Out of movies",
    noneMatched: "No movies matched. Try different genres or watchlists.",
    kindLabel: "Movie",
    readyToast: "Movies ready",
    pickerBlurb: "The pool mixes every movie on the lists you tick.",
    yearLabel: "Year Range",
    toggle: "Movies"
  })
})

test("TV copy talks about shows", () => {
  const tv = mediaCopy("tv")
  assert.equal(tv.plural, "shows")
  assert.equal(tv.outOf, "Out of shows")
  assert.equal(tv.kindLabel, "TV series")
  assert.equal(tv.yearLabel, "First aired")
  assert.equal(tv.toggle, "TV shows")
})

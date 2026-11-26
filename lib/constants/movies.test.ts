import assert from "node:assert/strict"
import { test } from "node:test"
import { MOVIE_GENRES, RATING_STEPS, YEAR_RANGES, voteFloor } from "./movies"

test("offers Any, 6+, 7+ and 8+ ratings", () => {
  assert.deepEqual([...RATING_STEPS], [0, 6, 7, 8])
})

test("raises the vote floor with the rating", () => {
  assert.equal(voteFloor(0), 50)
  assert.equal(voteFloor(6), 50)
  assert.equal(voteFloor(7), 100)
  assert.equal(voteFloor(8), 200)
})

test("has a 2020s preset that runs to this year", () => {
  const preset = YEAR_RANGES.find(r => r.label === "2020s")
  assert.deepEqual(preset?.value, {
    min: 2020,
    max: new Date().getFullYear()
  })
})

test("keeps every year preset label unique", () => {
  const labels = YEAR_RANGES.map(r => r.label)
  assert.equal(new Set(labels).size, labels.length)
})

test("still lists the movie genres", () => {
  assert.equal(MOVIE_GENRES.length, 19)
})

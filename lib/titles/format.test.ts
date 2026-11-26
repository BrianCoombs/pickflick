import assert from "node:assert/strict"
import { test } from "node:test"
import { formatSeasonsEpisodes, titleLengthLabel } from "./format"

test("seasons and episodes, plural and singular", () => {
  assert.equal(formatSeasonsEpisodes(5, 62), "5 seasons · 62 episodes")
  assert.equal(formatSeasonsEpisodes(1, 8), "1 season · 8 episodes")
  assert.equal(formatSeasonsEpisodes(1, 1), "1 season · 1 episode")
  assert.equal(formatSeasonsEpisodes(2, 1), "2 seasons · 1 episode")
})

test("shows only the count TMDb knows", () => {
  assert.equal(formatSeasonsEpisodes(null, 10), "10 episodes")
  assert.equal(formatSeasonsEpisodes(0, 10), "10 episodes")
  assert.equal(formatSeasonsEpisodes(3, null), "3 seasons")
  assert.equal(formatSeasonsEpisodes(3, 0), "3 seasons")
})

test("nothing to show without a positive count", () => {
  assert.equal(formatSeasonsEpisodes(null, null), null)
  assert.equal(formatSeasonsEpisodes(0, 0), null)
  assert.equal(formatSeasonsEpisodes(-1, NaN), null)
  assert.equal(formatSeasonsEpisodes(undefined, undefined), null)
})

const length = (
  mediaType: "movie" | "tv",
  runtimeMinutes: number | null,
  seasons: number | null,
  episodes: number | null
) => titleLengthLabel({ mediaType, runtimeMinutes, seasons, episodes })

test("movies show their runtime", () => {
  assert.equal(length("movie", 112, null, null), "1h 52m")
  assert.equal(length("movie", null, null, null), null)
})

test("TV shows seasons and episodes, never runtime", () => {
  assert.equal(length("tv", 60, 5, 62), "5 seasons · 62 episodes")
  assert.equal(length("tv", 45, null, null), null)
})

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { test } from "node:test"
import {
  movieToTitle,
  providersFrom,
  trailerFrom,
  tvToTitle,
  yearOf
} from "./normalize"

// Trimmed real TMDb responses (append_to_response=videos,watch/providers)
const fixture = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "__fixtures__", name), "utf8"))
const matrix = fixture("movie-603.json")
const blackMirror = fixture("tv-42009.json")
const got = fixture("tv-1399.json")

test("yearOf reads the year from the string, not a Date", () => {
  // new Date("2000-01-01") is 1999 in US time zones
  assert.equal(yearOf("2000-01-01"), 2000)
  assert.equal(yearOf("1999-03-31"), 1999)
})

test("yearOf has no year for missing or junk dates", () => {
  assert.equal(yearOf(""), null)
  assert.equal(yearOf(null), null)
  assert.equal(yearOf(undefined), null)
  assert.equal(yearOf("abcd"), null)
  assert.equal(yearOf("20"), null)
})

test("movieToTitle normalizes The Matrix", () => {
  const t = movieToTitle(matrix)
  assert.equal(t.mediaType, "movie")
  assert.equal(t.id, 603)
  assert.equal(t.key, "movie:603")
  assert.equal(t.name, "The Matrix")
  assert.equal(t.year, 1999)
  assert.equal(t.runtimeMinutes, 136)
  assert.equal(t.seasons, null)
  assert.equal(t.episodes, null)
  assert.equal(t.tagline, "Believe the unbelievable.")
  assert.equal(t.posterPath, "/dXNAPwY7VrqMAo51EKhhCJfaGb5.jpg")
  assert.deepEqual(t.genres, [
    { id: 28, name: "Action" },
    { id: 878, name: "Science Fiction" }
  ])
  assert.equal(t.rating, matrix.vote_average)
  assert.equal(t.voteCount, matrix.vote_count)
  assert.ok(t.overview.length > 0)
  assert.equal(t.trailerUrl, "https://www.youtube.com/watch?v=FVI84Dfx2-I")
  assert.deepEqual(t.providers, [
    {
      id: 2528,
      name: "YouTube TV",
      logoPath: "/48bVXEIyCLSL9pZUQ7gB9ToyWto.png"
    }
  ])
})

test("movieToTitle: runtime 0 is unknown", () => {
  assert.equal(movieToTitle({ ...matrix, runtime: 0 }).runtimeMinutes, null)
})

test("movieToTitle tolerates a bare object", () => {
  const t = movieToTitle({ id: 7 })
  assert.equal(t.key, "movie:7")
  assert.equal(t.name, "")
  assert.equal(t.overview, "")
  assert.equal(t.posterPath, null)
  assert.equal(t.backdropPath, null)
  assert.equal(t.year, null)
  assert.deepEqual(t.genres, [])
  assert.equal(t.rating, 0)
  assert.equal(t.voteCount, 0)
  assert.equal(t.runtimeMinutes, null)
  assert.equal(t.tagline, null)
  assert.equal(t.trailerUrl, null)
  assert.deepEqual(t.providers, [])
})

test("tvToTitle normalizes Black Mirror", () => {
  const t = tvToTitle(blackMirror)
  assert.equal(t.mediaType, "tv")
  assert.equal(t.id, 42009)
  assert.equal(t.key, "tv:42009")
  assert.equal(t.name, "Black Mirror")
  assert.equal(t.year, 2011)
  assert.equal(t.seasons, 7)
  assert.equal(t.episodes, 33)
  // episode_run_time is [], so the last episode's runtime is used
  assert.deepEqual(blackMirror.episode_run_time, [])
  assert.equal(t.runtimeMinutes, blackMirror.last_episode_to_air.runtime)
  assert.equal(t.tagline, "The future is bright.")
  assert.equal(t.trailerUrl, "https://www.youtube.com/watch?v=1iqra1ojEvM")
  assert.deepEqual(
    t.providers.map(p => [p.id, p.name]),
    [
      [8, "Netflix"],
      [1796, "Netflix Standard with Ads"]
    ]
  )
})

test("tvToTitle normalizes Game of Thrones", () => {
  const t = tvToTitle(got)
  assert.equal(t.key, "tv:1399")
  assert.equal(t.seasons, 8)
  assert.equal(t.episodes, 73)
  assert.equal(t.runtimeMinutes, 80)
  assert.equal(t.trailerUrl, "https://www.youtube.com/watch?v=KPLWWIOCOOQ")
})

test("tvToTitle prefers episode_run_time when TMDb has it", () => {
  assert.equal(tvToTitle({ ...got, episode_run_time: [45] }).runtimeMinutes, 45)
})

test("tvToTitle tolerates empty and missing fields", () => {
  const t = tvToTitle({
    id: 9,
    name: "New Show",
    tagline: "",
    first_air_date: "",
    episode_run_time: [],
    last_episode_to_air: null
  })
  assert.equal(t.tagline, null)
  assert.equal(t.year, null)
  assert.equal(t.seasons, null)
  assert.equal(t.episodes, null)
  assert.equal(t.runtimeMinutes, null)
  assert.deepEqual(t.providers, [])
  assert.equal(t.trailerUrl, null)
})

test("the same id as a movie and a show gives different keys", () => {
  assert.notEqual(movieToTitle({ id: 42009 }).key, tvToTitle({ id: 42009 }).key)
})

test("providersFrom reads US subscriptions sorted by display priority", () => {
  const raw = {
    results: {
      US: {
        flatrate: [
          { provider_id: 15, provider_name: "Hulu", display_priority: 5 },
          {
            provider_id: 8,
            provider_name: "Netflix",
            logo_path: "/n.png",
            display_priority: 1
          }
        ],
        rent: [{ provider_id: 10, provider_name: "Amazon Video" }]
      }
    }
  }
  assert.deepEqual(providersFrom(raw), [
    { id: 8, name: "Netflix", logoPath: "/n.png" },
    { id: 15, name: "Hulu", logoPath: null }
  ])
})

test("providersFrom has none without a US entry or the appended block", () => {
  assert.deepEqual(providersFrom({ results: { GB: { flatrate: [] } } }), [])
  assert.deepEqual(providersFrom(undefined), [])
  assert.deepEqual(providersFrom(null), [])
  assert.deepEqual(providersFrom({ results: { US: {} } }), [])
})

test("providersFrom takes another region", () => {
  const ids = providersFrom(blackMirror["watch/providers"], "GB").map(p => p.id)
  assert.deepEqual(ids, [8, 1796])
})

test("trailerFrom picks a YouTube trailer, official first", () => {
  const videos = {
    results: [
      { site: "YouTube", type: "Featurette", key: "feat", official: true },
      { site: "Vimeo", type: "Trailer", key: "vimeo", official: true },
      { site: "YouTube", type: "Trailer", key: "fan", official: false },
      { site: "YouTube", type: "Trailer", key: "real", official: true }
    ]
  }
  assert.equal(trailerFrom(videos), "https://www.youtube.com/watch?v=real")
})

test("trailerFrom falls back to an unofficial trailer", () => {
  const videos = {
    results: [{ site: "YouTube", type: "Trailer", key: "fan", official: false }]
  }
  assert.equal(trailerFrom(videos), "https://www.youtube.com/watch?v=fan")
})

test("trailerFrom has none without a YouTube trailer", () => {
  assert.equal(
    trailerFrom({ results: [{ site: "YouTube", type: "Clip", key: "c" }] }),
    null
  )
  assert.equal(trailerFrom({ results: [] }), null)
  assert.equal(trailerFrom(undefined), null)
  assert.equal(trailerFrom(null), null)
})

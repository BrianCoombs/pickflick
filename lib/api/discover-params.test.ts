import assert from "node:assert/strict"
import { test } from "node:test"
import type { FilterPreferences } from "../sessions/preferences"
import { buildDiscoverParams } from "./discover-params"

const base: FilterPreferences = {
  version: 2,
  mode: "filters",
  genres: [],
  minRating: 6,
  providers: [],
  region: "US"
}

test("always sorts by popularity, hides adult titles and sets a vote floor", () => {
  const params = buildDiscoverParams("movie", base, { page: 3, voteFloor: 50 })
  assert.equal(params.sort_by, "popularity.desc")
  assert.equal(params.include_adult, "false")
  assert.equal(params.page, "3")
  assert.equal(params["vote_count.gte"], "50")
})

test("asks for one genre per bucket", () => {
  const none = buildDiscoverParams("movie", base, { page: 1, voteFloor: 50 })
  assert.equal("with_genres" in none, false)
  const horror = buildDiscoverParams("movie", base, {
    genreId: 27,
    page: 1,
    voteFloor: 50
  })
  assert.equal(horror.with_genres, "27")
})

test("ORs provider ids in table order, US subscriptions only", () => {
  const params = buildDiscoverParams(
    "movie",
    { ...base, providers: ["peacock", "netflix"] },
    { page: 1, voteFloor: 50 }
  )
  assert.equal(params.with_watch_providers, "8|386|387")
  assert.equal(params.watch_region, "US")
  assert.equal(params.with_watch_monetization_types, "flatrate")
})

test("leaves provider keys out when no provider is chosen", () => {
  const params = buildDiscoverParams("movie", base, { page: 1, voteFloor: 50 })
  assert.equal("with_watch_providers" in params, false)
  assert.equal("watch_region" in params, false)
  assert.equal("with_watch_monetization_types" in params, false)
})

test("leaves the rating out for Any", () => {
  const any = buildDiscoverParams(
    "movie",
    { ...base, minRating: 0 },
    { page: 1, voteFloor: 50 }
  )
  assert.equal("vote_average.gte" in any, false)
  const seven = buildDiscoverParams(
    "movie",
    { ...base, minRating: 7 },
    { page: 1, voteFloor: 100 }
  )
  assert.equal(seven["vote_average.gte"], "7")
  assert.equal(seven["vote_count.gte"], "100")
})

test("uses release dates for movies", () => {
  const params = buildDiscoverParams(
    "movie",
    { ...base, minYear: 1990, maxYear: 1999 },
    { page: 1, voteFloor: 50 }
  )
  assert.equal(params["primary_release_date.gte"], "1990-01-01")
  assert.equal(params["primary_release_date.lte"], "1999-12-31")
  assert.equal("first_air_date.gte" in params, false)
})

test("uses first air dates for TV", () => {
  const params = buildDiscoverParams(
    "tv",
    { ...base, minYear: 2010 },
    { page: 1, voteFloor: 50 }
  )
  assert.equal(params["first_air_date.gte"], "2010-01-01")
  assert.equal("first_air_date.lte" in params, false)
  assert.equal("primary_release_date.gte" in params, false)
})

test("sends no dates without years", () => {
  const params = buildDiscoverParams("tv", base, { page: 1, voteFloor: 50 })
  const dateKeys = Object.keys(params).filter(k => k.includes("date"))
  assert.deepEqual(dateKeys, [])
})

test("always leaves News and Talk out of TV, and nothing out of movies", () => {
  const tv = buildDiscoverParams("tv", base, { page: 1, voteFloor: 50 })
  assert.equal(tv.without_genres, "10763,10767")
  const movie = buildDiscoverParams("movie", base, { page: 1, voteFloor: 50 })
  assert.equal("without_genres" in movie, false)
})

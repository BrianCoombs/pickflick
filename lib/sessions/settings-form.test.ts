import assert from "node:assert/strict"
import { test } from "node:test"
import { defaultFilterPreferences } from "./preferences"
import {
  failedWatchlistNames,
  initialFormState,
  initialSourceKeys,
  parseSourceKey,
  shortPoolMessage,
  sourceKey,
  switchMediaType,
  toggleIn,
  toSettings,
  usableSources,
  yearPresetLabel
} from "./settings-form"

const movieDefaults = {
  mediaType: "movie" as const,
  matchMode: "first" as const,
  preferences: defaultFilterPreferences()
}

// initialFormState

test("defaults start in filters mode with a 6+ rating and no years", () => {
  const state = initialFormState(movieDefaults)
  assert.equal(state.poolMode, "filters")
  assert.equal(state.minRating, 6)
  assert.deepEqual(state.genres, [])
  assert.deepEqual(state.providers, [])
  assert.equal(state.minYear, "")
  assert.equal(state.maxYear, "")
  assert.deepEqual(state.sources, [])
})

test("saved filters fill the form", () => {
  const state = initialFormState({
    mediaType: "movie",
    matchMode: "all",
    preferences: {
      ...defaultFilterPreferences(),
      genres: [28, 35],
      providers: ["netflix"],
      minRating: 7,
      minYear: 1990,
      maxYear: 1999
    }
  })
  assert.equal(state.matchMode, "all")
  assert.deepEqual(state.genres, [28, 35])
  assert.deepEqual(state.providers, ["netflix"])
  assert.equal(state.minRating, 7)
  assert.equal(state.minYear, "1990")
  assert.equal(state.maxYear, "1999")
})

test("saved watchlists start in watchlist mode with their keys", () => {
  const state = initialFormState({
    mediaType: "movie",
    matchMode: "first",
    preferences: {
      mode: "watchlists",
      sources: [{ userId: "u1", sourceType: "trakt" }]
    }
  })
  assert.equal(state.poolMode, "watchlists")
  assert.deepEqual(state.sources, ["u1:trakt"])
  assert.equal(state.minRating, 6) // filter defaults behind the switch
})

test("genres that don't belong to the media type are dropped", () => {
  const state = initialFormState({
    mediaType: "tv",
    matchMode: "first",
    preferences: { ...defaultFilterPreferences(), genres: [28, 35] } // 28 is movie-only
  })
  assert.deepEqual(state.genres, [35])
})

// switchMediaType

test("switching media type clears genres and keeps the rest", () => {
  const state = {
    ...initialFormState(movieDefaults),
    genres: [28],
    providers: ["netflix" as const],
    minRating: 7 as const
  }
  const next = switchMediaType(state, "tv")
  assert.equal(next.mediaType, "tv")
  assert.deepEqual(next.genres, [])
  assert.deepEqual(next.providers, ["netflix"])
  assert.equal(next.minRating, 7)
})

test("switching to TV keeps Letterboxd picks for the way back", () => {
  const state = {
    ...initialFormState(movieDefaults),
    sources: ["u1:trakt", "u1:letterboxd", "u2:letterboxd"]
  }
  const tv = switchMediaType(state, "tv")
  assert.deepEqual(usableSources(tv), ["u1:trakt"])
  assert.deepEqual(switchMediaType(tv, "movie").sources, [
    "u1:trakt",
    "u1:letterboxd",
    "u2:letterboxd"
  ])
})

test("usable sources only count lists the media type can use", () => {
  const state = {
    ...initialFormState({ ...movieDefaults, mediaType: "tv" }),
    poolMode: "watchlists" as const,
    sources: ["u1:letterboxd"]
  }
  assert.deepEqual(usableSources(state), [])
  assert.deepEqual(toSettings(state).preferences, {
    mode: "watchlists",
    sources: []
  })
})

test("switching to the same media type changes nothing", () => {
  const state = { ...initialFormState(movieDefaults), genres: [28] }
  assert.equal(switchMediaType(state, "movie"), state)
})

// toSettings

test("filters mode sends version 2 filter preferences", () => {
  const state = {
    ...initialFormState(movieDefaults),
    genres: [28],
    providers: ["max" as const],
    minRating: 0 as const,
    minYear: "2000",
    maxYear: "2009"
  }
  assert.deepEqual(toSettings(state), {
    mediaType: "movie",
    matchMode: "first",
    preferences: {
      version: 2,
      mode: "filters",
      genres: [28],
      minYear: 2000,
      maxYear: 2009,
      minRating: 0,
      providers: ["max"],
      region: "US"
    }
  })
})

test("blank or junk years are left open", () => {
  const state = {
    ...initialFormState(movieDefaults),
    minYear: "",
    maxYear: "abc"
  }
  const { preferences } = toSettings(state)
  assert.equal(preferences.mode, "filters")
  if (preferences.mode !== "filters") return
  assert.equal(preferences.minYear, undefined)
  assert.equal(preferences.maxYear, undefined)
})

test("years typed backwards are swapped", () => {
  const state = {
    ...initialFormState(movieDefaults),
    minYear: "2010",
    maxYear: "1990"
  }
  const { preferences } = toSettings(state)
  assert.ok(preferences.mode === "filters")
  if (preferences.mode !== "filters") return
  assert.equal(preferences.minYear, 1990)
  assert.equal(preferences.maxYear, 2010)
})

test("watchlist mode sends the picked sources", () => {
  const state = {
    ...initialFormState(movieDefaults),
    poolMode: "watchlists" as const,
    sources: ["u1:trakt", "u2:letterboxd"]
  }
  assert.deepEqual(toSettings(state).preferences, {
    mode: "watchlists",
    sources: [
      { userId: "u1", sourceType: "trakt" },
      { userId: "u2", sourceType: "letterboxd" }
    ]
  })
})

test("watchlist mode for TV never sends Letterboxd", () => {
  const state = {
    ...initialFormState({ ...movieDefaults, mediaType: "tv" }),
    poolMode: "watchlists" as const,
    sources: ["u1:trakt", "u2:letterboxd"]
  }
  assert.deepEqual(toSettings(state).preferences, {
    mode: "watchlists",
    sources: [{ userId: "u1", sourceType: "trakt" }]
  })
})

// source keys

test("source keys round-trip", () => {
  assert.equal(sourceKey("u1", "trakt"), "u1:trakt")
  assert.deepEqual(parseSourceKey("u1:trakt"), {
    userId: "u1",
    sourceType: "trakt"
  })
  assert.equal(parseSourceKey("u1:netflix"), null)
  assert.equal(parseSourceKey("nope"), null)
})

test("initial sources keep earlier picks that are still available", () => {
  assert.deepEqual(
    initialSourceKeys(
      ["u1:trakt", "gone:trakt"],
      ["u1:trakt", "u2:trakt"],
      "movie"
    ),
    ["u1:trakt"]
  )
})

test("with no earlier picks, every available list is ticked", () => {
  assert.deepEqual(initialSourceKeys([], ["u1:trakt", "u2:trakt"], "movie"), [
    "u1:trakt",
    "u2:trakt"
  ])
  assert.deepEqual(initialSourceKeys(["gone:trakt"], ["u1:trakt"], "movie"), [
    "u1:trakt"
  ])
})

test("TV never ticks Letterboxd lists by default", () => {
  assert.deepEqual(initialSourceKeys([], ["u1:trakt", "u1:letterboxd"], "tv"), [
    "u1:trakt"
  ])
})

test("earlier picks the media type can't use don't stop the defaults", () => {
  assert.deepEqual(
    initialSourceKeys(["u1:letterboxd"], ["u1:letterboxd", "u2:trakt"], "tv"),
    ["u1:letterboxd", "u2:trakt"]
  )
})

// toggleIn

test("toggleIn adds and removes", () => {
  assert.deepEqual(toggleIn([1, 2], 3), [1, 2, 3])
  assert.deepEqual(toggleIn([1, 2, 3], 2), [1, 3])
})

// yearPresetLabel

test("year presets are recognised from the typed years", () => {
  assert.equal(yearPresetLabel("", ""), "All years")
  assert.equal(yearPresetLabel("1990", "1999"), "1990s")
  assert.equal(yearPresetLabel("1990", "2001"), "")
  assert.equal(yearPresetLabel("1990", ""), "")
})

// shortPoolMessage

test("short pool message counts titles in the media type's words", () => {
  assert.equal(shortPoolMessage(12, "movie"), "Only 12 movies match")
  assert.equal(shortPoolMessage(1, "tv"), "Only 1 show matches")
})

// failedWatchlistNames

test("failed watchlists are named after their owners", () => {
  assert.deepEqual(
    failedWatchlistNames(
      [
        { userId: "u1", sourceType: "trakt" },
        { userId: "u9", sourceType: "letterboxd" },
        { userId: "me", sourceType: "trakt" }
      ],
      [
        { userId: "u1", name: "Cass" },
        { userId: "me", name: "You" }
      ]
    ),
    ["Cass's Trakt", "Someone's Letterboxd", "Your Trakt"]
  )
})

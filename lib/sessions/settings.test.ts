import assert from "node:assert/strict"
import { test } from "node:test"
import { describeSessionSettings, type SettingsRow } from "./settings"

const people = [
  { userId: "sam", name: "Sam" },
  { userId: "alex", name: "Alex" }
]

const valueOf = (rows: SettingsRow[], label: string) =>
  rows.find(row => row.label === label)?.value

test("filter preferences list ending, showing, filters and pool in order", () => {
  const rows = describeSessionSettings(
    {
      matchMode: "all",
      mediaType: "movie",
      preferences: {
        mode: "filters",
        genres: [28, 35],
        minYear: 1990,
        maxYear: 1999,
        minRating: 7,
        providers: ["netflix", "hulu"]
      },
      poolLength: 100
    },
    people
  )
  assert.deepEqual(rows, [
    { label: "Ending", value: "Swipe them all, see every match" },
    { label: "Showing", value: "Movies" },
    { label: "Genres", value: "Action, Comedy" },
    { label: "Years", value: "1990–1999" },
    { label: "Rating", value: "7+ rating" },
    { label: "Streaming on", value: "Netflix, Hulu" },
    { label: "Pool", value: "100 tapes" }
  ])
})

test("empty filter preferences show Any", () => {
  const rows = describeSessionSettings(
    {
      matchMode: "first",
      mediaType: "movie",
      preferences: { mode: "filters", minRating: 0 },
      poolLength: 1
    },
    people
  )
  assert.equal(valueOf(rows, "Genres"), "Any")
  assert.equal(valueOf(rows, "Years"), "Any")
  assert.equal(valueOf(rows, "Rating"), "Any")
  assert.equal(valueOf(rows, "Streaming on"), "Any")
  assert.equal(valueOf(rows, "Pool"), "1 tape")
})

test("only a minimum year still lands on the years row", () => {
  const rows = describeSessionSettings(
    {
      matchMode: "first",
      mediaType: "tv",
      preferences: { mode: "filters", minYear: 2010, minRating: 0 },
      poolLength: 50
    },
    people
  )
  assert.equal(valueOf(rows, "Showing"), "TV shows")
  assert.equal(valueOf(rows, "First aired"), "2010 or later")
  assert.equal(valueOf(rows, "Rating"), "Any")
})

test("watchlist preferences name each list instead of filters", () => {
  const rows = describeSessionSettings(
    {
      matchMode: "first",
      mediaType: "movie",
      preferences: {
        mode: "watchlists",
        sources: [
          { userId: "sam", sourceType: "letterboxd" },
          { userId: "alex", sourceType: "trakt" }
        ]
      },
      poolLength: 80
    },
    people
  )
  assert.deepEqual(rows, [
    { label: "Ending", value: "First tape everyone rents" },
    { label: "Showing", value: "Movies" },
    { label: "Picking from", value: "From watchlists" },
    { label: "Watchlists", value: "Sam's Letterboxd, Alex's Trakt" },
    { label: "Pool", value: "80 tapes" }
  ])
  assert.equal(valueOf(rows, "Genres"), undefined)
})

test("people who left are named Someone", () => {
  const rows = describeSessionSettings(
    {
      matchMode: "first",
      mediaType: "movie",
      preferences: {
        mode: "watchlists",
        sources: [{ userId: "gone", sourceType: "trakt" }]
      },
      poolLength: 10
    },
    people
  )
  assert.equal(valueOf(rows, "Watchlists"), "Someone's Trakt")
})

test("an unknown match mode reads as first mode", () => {
  const rows = describeSessionSettings(
    {
      matchMode: "sometimes",
      mediaType: "movie",
      preferences: null,
      poolLength: 0
    },
    []
  )
  assert.equal(valueOf(rows, "Ending"), "First tape everyone rents")
  assert.equal(valueOf(rows, "Pool"), "0 tapes")
})

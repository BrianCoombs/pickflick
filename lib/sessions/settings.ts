import { mediaCopy } from "../titles/copy"
import { parseMediaType } from "../titles/title"
import { describePreferences, normalizePreferences } from "./preferences"
import { parseMatchMode } from "./progress"

export interface SettingsRow {
  label: string
  value: string
}

// Only what the summary reads from each person (a WatchlistOption fits)
export interface SettingsPerson {
  userId: string
  name: string
}

const ENDINGS = {
  first: "First tape everyone rents",
  all: "Swipe them all, see every match"
} as const

const SOURCE_NAMES = { trakt: "Trakt", letterboxd: "Letterboxd" } as const

const ANY = "Any"

// The read-only "Rental terms" rows. Takes the session's raw columns, so
// anything odd in the database still reads sensibly.
export function describeSessionSettings(
  {
    matchMode,
    mediaType,
    preferences,
    poolLength
  }: {
    matchMode: unknown
    mediaType: unknown
    preferences: unknown
    poolLength: number
  },
  people: SettingsPerson[]
): SettingsRow[] {
  const media = parseMediaType(mediaType)
  const prefs = normalizePreferences(preferences, media)
  const lines = describePreferences(prefs, media)

  const rows: SettingsRow[] = [
    { label: "Ending", value: ENDINGS[parseMatchMode(matchMode)] },
    { label: "Showing", value: mediaCopy(media).toggle }
  ]

  if (prefs.mode === "watchlists") {
    const names = new Map(people.map(p => [p.userId, p.name]))
    const lists = prefs.sources.map(
      s => `${names.get(s.userId) ?? "Someone"}'s ${SOURCE_NAMES[s.sourceType]}`
    )
    rows.push(
      { label: "Picking from", value: lines[0] },
      { label: "Watchlists", value: lists.length ? lists.join(", ") : "None" }
    )
  } else {
    // describePreferences drops lines for unset filters; walk them in the
    // same order so each value lands on its own row
    let next = 0
    const take = (present: boolean) => (present ? lines[next++] : null)
    const genres = take(true)
    const years = take(
      prefs.minYear !== undefined || prefs.maxYear !== undefined
    )
    const rating = take(prefs.minRating > 0)
    const providers = take(prefs.providers.length > 0)

    rows.push(
      { label: "Genres", value: prefs.genres.length ? (genres ?? ANY) : ANY },
      { label: media === "tv" ? "First aired" : "Years", value: years ?? ANY },
      { label: "Rating", value: rating ?? ANY },
      { label: "Streaming on", value: providers ?? ANY }
    )
  }

  rows.push({
    label: "Pool",
    value: `${poolLength} ${poolLength === 1 ? "tape" : "tapes"}`
  })
  return rows
}

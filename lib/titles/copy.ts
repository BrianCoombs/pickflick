import type { MediaType } from "./title"

export interface MediaCopy {
  plural: string
  singular: string
  outOf: string // out-of-titles heading
  noneMatched: string
  kindLabel: string // receipt fallback when there are no details
  readyToast: string
  pickerBlurb: string
  yearLabel: string
  toggle: string // new session Movies / TV shows toggle
}

// Movie strings are the app's copy as of 2026-11-25; keep them in sync
const MOVIE_COPY: MediaCopy = {
  plural: "movies",
  singular: "movie",
  outOf: "Out of movies",
  noneMatched: "No movies matched. Try different genres or watchlists.",
  kindLabel: "Movie",
  readyToast: "Movies ready",
  pickerBlurb: "The pool mixes every movie on the lists you tick.",
  yearLabel: "Year Range",
  toggle: "Movies"
}

const TV_COPY: MediaCopy = {
  plural: "shows",
  singular: "show",
  outOf: "Out of shows",
  noneMatched: "No shows matched. Try different genres or watchlists.",
  kindLabel: "TV series",
  readyToast: "Shows ready",
  pickerBlurb: "The pool mixes every show on the lists you tick.",
  yearLabel: "First aired",
  toggle: "TV shows"
}

export function mediaCopy(mediaType: MediaType): MediaCopy {
  return mediaType === "tv" ? TV_COPY : MOVIE_COPY
}

import type { MediaType } from "./title"

export interface MediaCopy {
  plural: string
  singular: string
  outOf: string // out-of-titles heading
  noneMatched: string
  kindLabel: string // receipt fallback when there are no details
  chooseButton: string // lobby button and dialog title
  changeButton: string // swiping screen
  updateTitle: string
  readyToast: string
  newSessionHeading: string
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
  chooseButton: "Choose Movies",
  changeButton: "Change movies",
  updateTitle: "Update Movie Criteria",
  readyToast: "Movies ready",
  newSessionHeading: "What kind of movie?",
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
  chooseButton: "Choose Shows",
  changeButton: "Change shows",
  updateTitle: "Update Show Criteria",
  readyToast: "Shows ready",
  newSessionHeading: "What kind of show?",
  pickerBlurb: "The pool mixes every show on the lists you tick.",
  yearLabel: "First aired",
  toggle: "TV shows"
}

export function mediaCopy(mediaType: MediaType): MediaCopy {
  return mediaType === "tv" ? TV_COPY : MOVIE_COPY
}

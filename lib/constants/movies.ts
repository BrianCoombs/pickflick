export const MOVIE_GENRES = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" }
] as const

export const YEAR_RANGES = [
  { label: "All years", value: null },
  { label: "2020 - 2025", value: { min: 2020, max: 2025 } },
  { label: "2015 - 2019", value: { min: 2015, max: 2019 } },
  { label: "2010 - 2014", value: { min: 2010, max: 2014 } },
  { label: "2005 - 2009", value: { min: 2005, max: 2009 } },
  { label: "2000 - 2004", value: { min: 2000, max: 2004 } },
  { label: "1990s", value: { min: 1990, max: 1999 } },
  { label: "1980s", value: { min: 1980, max: 1989 } },
  { label: "1970s", value: { min: 1970, max: 1979 } }
] as const

export const DEFAULT_MIN_RATING = 6
export const DEFAULT_MIN_YEAR = 1990
export const DEFAULT_MAX_YEAR = new Date().getFullYear()

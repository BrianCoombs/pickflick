/*
<ai_context>
Reads public Letterboxd watchlists. Letterboxd's API is invite-only, so this
fetches the public watchlist pages, then each film's page for its TMDb id.
Slug -> TMDb matches are cached in letterboxd_films.
</ai_context>
*/

import { db } from "@/db/db"
import { letterboxdFilms } from "@/db/schema"
import { inArray } from "drizzle-orm"
import { mapWithConcurrency } from "./concurrency"
import {
  isWatchlistPage,
  parseFilmTmdbId,
  parseWatchlistPageCount,
  parseWatchlistSlugs
} from "./letterboxd-parse"

const BASE_URL = "https://letterboxd.com"
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
const FILM_PAGE_CONCURRENCY = 5
const MAX_PAGES = 50 // 28 films a page

export class LetterboxdError extends Error {
  constructor(
    message: string,
    public reason: "not_found" | "private_or_empty" | "blocked"
  ) {
    super(message)
    this.name = "LetterboxdError"
  }
}

export function letterboxdEnabled(): boolean {
  return process.env.LETTERBOXD_ENABLED !== "false"
}

async function fetchPage(
  path: string
): Promise<{ status: number; html: string }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "User-Agent": USER_AGENT },
    cache: "no-store"
  })
  const html = await res.text()
  if (
    res.status === 403 ||
    res.status === 429 ||
    /Just a moment|cf-chl/.test(html)
  ) {
    throw new LetterboxdError(`Letterboxd blocked ${path}`, "blocked")
  }
  return { status: res.status, html }
}

async function fetchWatchlistPage(username: string, page: number) {
  const path =
    page === 1
      ? `/${username}/watchlist/`
      : `/${username}/watchlist/page/${page}/`
  const { status, html } = await fetchPage(path)
  if (status === 404 || !isWatchlistPage(html)) {
    throw new LetterboxdError(`No Letterboxd user ${username}`, "not_found")
  }
  return {
    slugs: parseWatchlistSlugs(html),
    pageCount: parseWatchlistPageCount(html)
  }
}

// Used when someone saves their username: page 1 must exist and show films.
// A private watchlist and an empty one look the same from outside
export async function checkLetterboxdUser(
  username: string
): Promise<"ok" | LetterboxdError["reason"]> {
  try {
    const { slugs } = await fetchWatchlistPage(username, 1)
    return slugs.length > 0 ? "ok" : "private_or_empty"
  } catch (error) {
    if (error instanceof LetterboxdError) return error.reason
    throw error
  }
}

async function resolveTmdbIds(
  slugs: string[],
  deadline: number
): Promise<number[]> {
  const cached = new Map<string, number | null>()
  if (slugs.length > 0) {
    const rows = await db
      .select()
      .from(letterboxdFilms)
      .where(inArray(letterboxdFilms.slug, slugs))
    rows.forEach(row => cached.set(row.slug, row.tmdbId))
  }

  const missing = slugs.filter(slug => !cached.has(slug))
  const found = await mapWithConcurrency(
    missing,
    FILM_PAGE_CONCURRENCY,
    async slug => {
      // Out of time: skip the rest; they'll be looked up on a later build
      if (Date.now() > deadline) return null
      try {
        const { status, html } = await fetchPage(`/film/${slug}/`)
        return { slug, tmdbId: status === 200 ? parseFilmTmdbId(html) : null }
      } catch (error) {
        if (error instanceof LetterboxdError) throw error
        return null
      }
    }
  )

  const fresh = found.filter(
    (f): f is { slug: string; tmdbId: number | null } => f !== null
  )
  if (fresh.length > 0) {
    await db
      .insert(letterboxdFilms)
      .values(fresh.map(f => ({ ...f, updatedAt: new Date() })))
      .onConflictDoNothing()
    fresh.forEach(f => cached.set(f.slug, f.tmdbId))
  }

  return slugs
    .map(slug => cached.get(slug))
    .filter((id): id is number => typeof id === "number")
}

// Every movie on the user's public watchlist as TMDb ids. Stops early at the
// deadline (ms timestamp) and returns what it has so far
export async function getLetterboxdWatchlistTmdbIds(
  username: string,
  deadline: number
): Promise<number[]> {
  const first = await fetchWatchlistPage(username, 1)
  const pageCount = Math.min(first.pageCount, MAX_PAGES)
  const rest = await mapWithConcurrency(
    Array.from({ length: pageCount - 1 }, (_, i) => i + 2),
    FILM_PAGE_CONCURRENCY,
    async page =>
      Date.now() < deadline
        ? (await fetchWatchlistPage(username, page)).slugs
        : []
  )
  const slugs = Array.from(new Set([...first.slugs, ...rest.flat()]))

  if (slugs.length === 0) {
    throw new LetterboxdError(
      `${username}'s watchlist is empty or private`,
      "private_or_empty"
    )
  }

  return resolveTmdbIds(slugs, deadline)
}

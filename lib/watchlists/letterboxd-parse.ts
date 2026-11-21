/*
<ai_context>
Pure HTML parsing for public Letterboxd pages. Letterboxd has no open API, so
watchlists are read from their public pages.
</ai_context>
*/

// Film slugs on a watchlist page, in page order, without duplicates
export function parseWatchlistSlugs(html: string): string[] {
  const slugs = new Set<string>()
  for (const match of html.matchAll(/data-item-slug="([^"]+)"/g)) {
    slugs.add(match[1])
  }
  return Array.from(slugs)
}

// Watchlist pages are titled "<Name>'s Watchlist • Letterboxd"
export function isWatchlistPage(html: string): boolean {
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""
  return /watchlist/i.test(title)
}

// Only movies: some Letterboxd entries (miniseries, TV specials) link to TMDb
// TV ids, which overlap with movie ids
export function parseFilmTmdbId(html: string): number | null {
  const type = html.match(/data-tmdb-type="([a-z]+)"/)?.[1]
  if (type && type !== "movie") return null
  const match = html.match(/data-tmdb-id="(\d+)"/)
  return match ? Number(match[1]) : null
}

// What to record for a film page. Only a normal 200 answer is final; errors
// (404s, 5xx) are left uncached so a later build tries again
export function filmLookup(
  status: number,
  html: string
): { cache: boolean; tmdbId: number | null } {
  return status === 200
    ? { cache: true, tmdbId: parseFilmTmdbId(html) }
    : { cache: false, tmdbId: null }
}

// Accepts "dave", "@dave" or a letterboxd.com profile link. Letterboxd
// usernames are letters, digits and underscores
export function normalizeLetterboxdUsername(input: string): string | null {
  let value = input.trim().replace(/^@/, "")
  const fromUrl = value.match(/letterboxd\.com\/([^/?#]+)/i)
  if (fromUrl) value = fromUrl[1]
  return /^[A-Za-z0-9_]{1,30}$/.test(value) ? value.toLowerCase() : null
}

// Highest page number in the pagination links; 1 when there are none
export function parseWatchlistPageCount(html: string): number {
  const pages = Array.from(html.matchAll(/\/watchlist\/page\/(\d+)\//g), m =>
    Number(m[1])
  )
  return Math.max(1, ...pages)
}

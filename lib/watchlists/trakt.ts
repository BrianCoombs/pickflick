/*
<ai_context>
Trakt API client. Sign-in uses OAuth with PKCE and only the public client id;
Trakt's developer portal doesn't issue a client secret for this app.
</ai_context>
*/

import type { MediaType } from "../titles/title"

const AUTHORIZE_URL = "https://auth.trakt.tv/oauth/authorize"
const API_URL = "https://api.trakt.tv"

export interface TraktTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // ms timestamp
}

export class TraktError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
    this.name = "TraktError"
  }
}

function clientId(): string {
  const id = process.env.TRAKT_CLIENT_ID
  if (!id) throw new Error("TRAKT_CLIENT_ID is not set")
  return id
}

// Trakt's firewall rejects requests without a real User-Agent (403)
export function traktHeaders(accessToken?: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "User-Agent": "PickFlick/1.0",
    "trakt-api-version": "2",
    "trakt-api-key": clientId(),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { accessToken?: string } = {}
): Promise<T> {
  const { accessToken, ...rest } = init
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: traktHeaders(accessToken),
    cache: "no-store"
  })
  if (!res.ok) {
    throw new TraktError(`Trakt ${path} failed: ${res.status}`, res.status)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

export function traktAuthorizeUrl(
  redirectUri: string,
  state: string,
  challenge: string
): string {
  const url = new URL(AUTHORIZE_URL)
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId(),
    redirect_uri: redirectUri,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256"
  }).toString()
  return url.toString()
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number // seconds
  created_at: number // seconds
}

function toTokens(res: TokenResponse): TraktTokens {
  return {
    accessToken: res.access_token,
    refreshToken: res.refresh_token,
    expiresAt: (res.created_at + res.expires_in) * 1000
  }
}

export async function exchangeTraktCode(
  code: string,
  verifier: string,
  redirectUri: string
): Promise<TraktTokens> {
  const res = await request<TokenResponse>("/oauth/token", {
    method: "POST",
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      client_id: clientId(),
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  })
  return toTokens(res)
}

export async function refreshTraktToken(
  refreshToken: string,
  redirectUri: string
): Promise<TraktTokens> {
  const res = await request<TokenResponse>("/oauth/token", {
    method: "POST",
    body: JSON.stringify({
      refresh_token: refreshToken,
      client_id: clientId(),
      redirect_uri: redirectUri,
      grant_type: "refresh_token"
    })
  })
  return toTokens(res)
}

export async function revokeTraktToken(token: string): Promise<void> {
  await request("/oauth/revoke", {
    method: "POST",
    body: JSON.stringify({ token, client_id: clientId() })
  })
}

export async function getTraktUsername(accessToken: string): Promise<string> {
  const me = await request<{ username: string }>("/users/me", { accessToken })
  return me.username
}

export function traktWatchlistPath(mediaType: MediaType): string {
  return mediaType === "tv" ? "/sync/watchlist/shows" : "/sync/watchlist/movies"
}

// Watchlist items are { type: "movie", movie: {...} } or
// { type: "show", show: {...} }. Keeps the TMDb ids of the asked-for kind and
// drops items TMDb doesn't know (tmdb: null)
export function extractTraktTmdbIds(
  items: unknown,
  mediaType: MediaType
): number[] {
  if (!Array.isArray(items)) return []
  const kind = mediaType === "tv" ? "show" : "movie"
  return items.flatMap(item => {
    if (typeof item !== "object" || item === null) return []
    const { type, [kind]: entry } = item as Record<string, unknown>
    if (type !== undefined && type !== kind) return []
    const id = (entry as { ids?: { tmdb?: unknown } } | undefined)?.ids?.tmdb
    return typeof id === "number" && Number.isInteger(id) ? [id] : []
  })
}

// Trakt pages watchlists: 100 items by default, at most 250 per page, with the
// page count in X-Pagination-Page-Count. Without paging, anything past the
// first 100 was silently left out of the pool.
const WATCHLIST_PAGE_SIZE = 250
const MAX_WATCHLIST_PAGES = 20 // 5,000 titles is plenty for a 50-card pool

export async function getTraktWatchlistTmdbIds(
  accessToken: string,
  mediaType: MediaType = "movie"
): Promise<number[]> {
  const path = traktWatchlistPath(mediaType)
  const ids: number[] = []
  for (let page = 1; page <= MAX_WATCHLIST_PAGES; page++) {
    const res = await fetch(
      `${API_URL}${path}?page=${page}&limit=${WATCHLIST_PAGE_SIZE}`,
      { headers: traktHeaders(accessToken), cache: "no-store" }
    )
    if (!res.ok) {
      throw new TraktError(`Trakt ${path} failed: ${res.status}`, res.status)
    }
    ids.push(...extractTraktTmdbIds(await res.json(), mediaType))
    const pageCount = Number(res.headers.get("x-pagination-page-count") ?? 1)
    if (!Number.isFinite(pageCount) || page >= pageCount) break
  }
  return Array.from(new Set(ids))
}

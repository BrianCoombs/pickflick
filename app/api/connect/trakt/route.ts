import { NextRequest, NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { createPkcePair } from "@/lib/watchlists/pkce"
import { traktRedirectUri } from "@/lib/watchlists/redirect"
import { traktAuthorizeUrl } from "@/lib/watchlists/trakt"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/api/connect/trakt",
  maxAge: 10 * 60
}

// Starts Trakt sign-in. The PKCE verifier and state live in short-lived
// cookies until Trakt redirects back to the callback
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { verifier, challenge } = createPkcePair()
  const state = randomBytes(16).toString("hex")
  const redirectUri = traktRedirectUri(request.nextUrl.origin)

  const response = NextResponse.redirect(
    traktAuthorizeUrl(redirectUri, state, challenge)
  )
  response.cookies.set("trakt_pkce", verifier, COOKIE_OPTIONS)
  response.cookies.set("trakt_state", state, COOKIE_OPTIONS)
  return response
}

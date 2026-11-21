import { NextRequest, NextResponse } from "next/server"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { traktRedirectUri } from "@/lib/watchlists/redirect"
import { upsertSource } from "@/lib/watchlists/sources"
import { exchangeTraktCode, getTraktUsername } from "@/lib/watchlists/trakt"

export async function GET(request: NextRequest) {
  const settings = (params: Record<string, string>) => {
    const url = new URL("/settings", request.url)
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const response = NextResponse.redirect(url)
    response.cookies.delete({ name: "trakt_pkce", path: "/api/connect/trakt" })
    response.cookies.delete({ name: "trakt_state", path: "/api/connect/trakt" })
    return response
  }

  const user = await getAuthenticatedUser()
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const { searchParams } = request.nextUrl
  // Trakt sends ?error=access_denied when the user cancels, or when they
  // aren't allowed to use the app yet (Development apps only allow members)
  if (searchParams.get("error")) {
    return settings({ error: "trakt_denied" })
  }

  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const verifier = request.cookies.get("trakt_pkce")?.value
  const expectedState = request.cookies.get("trakt_state")?.value

  if (!code || !verifier || !state || state !== expectedState) {
    return settings({ error: "trakt_state" })
  }

  try {
    const redirectUri = traktRedirectUri(request.nextUrl.origin)
    const tokens = await exchangeTraktCode(code, verifier, redirectUri)
    const username = await getTraktUsername(tokens.accessToken)
    await upsertSource({
      userId: user.id,
      sourceType: "trakt",
      username,
      ...tokens
    })
    return settings({ linked: "trakt" })
  } catch (error) {
    console.error("Trakt link failed:", error)
    return settings({ error: "trakt_failed" })
  }
}

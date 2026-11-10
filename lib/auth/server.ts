/*
<ai_context>
Server-side Neon Auth instance (managed Better Auth). Provides the API route
handler, the route-protection proxy, and session lookups for server code.
</ai_context>
*/

import { createNeonAuth } from "@neon/auth/next/server"

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!
  }
})

export async function getAuthenticatedUser() {
  const { data } = await auth.getSession()
  return data?.user ?? null
}

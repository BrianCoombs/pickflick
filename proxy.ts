/*
<ai_context>
Protects app routes with Neon Auth. Unauthenticated visitors are sent to /login.
</ai_context>
*/

import { auth } from "@/lib/auth/server"

export default auth.middleware({ loginUrl: "/login" })

export const config = {
  matcher: [
    "/sessions/:path*",
    "/friends/:path*",
    "/movies/:path*",
    "/history/:path*",
    "/settings/:path*"
  ]
}

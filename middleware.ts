/*
<ai_context>
Contains middleware for protecting routes, checking user authentication, and redirecting as needed.
</ai_context>
*/

import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isProtectedRoute = createRouteMatcher([
  "/sessions(.*)",
  "/friends(.*)",
  "/movies(.*)",
  "/history(.*)",
  "/settings(.*)"
])

export default clerkMiddleware(async (auth, req) => {
  try {
    const { userId, redirectToSignIn } = await auth()

    // If the user isn't signed in and the route is private, redirect to sign-in
    if (!userId && isProtectedRoute(req)) {
      return redirectToSignIn({ returnBackUrl: "/login" })
    }

    // If the user is logged in and the route is protected, let them view.
    if (userId && isProtectedRoute(req)) {
      return NextResponse.next()
    }

    // For all other cases (public routes), continue
    return NextResponse.next()
  } catch (error) {
    console.error("Middleware error:", error)
    // In case of error, allow the request to continue
    return NextResponse.next()
  }
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/",
    "/(api|trpc)(.*)"
  ]
}

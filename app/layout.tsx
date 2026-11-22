/*
<ai_context>
The root server layout for the app.
</ai_context>
*/

import {
  createProfileAction,
  getProfileByUserIdAction
} from "@/actions/db/profiles-actions"
import { Toaster } from "@/components/ui/toaster"
import { PostHogPageview } from "@/components/utilities/posthog/posthog-pageview"
import { PostHogUserIdentify } from "@/components/utilities/posthog/posthog-user-identity"
import { Providers } from "@/components/utilities/providers"
import { TailwindIndicator } from "@/components/utilities/tailwind-indicator"
import { cn } from "@/lib/utils"
import { getAuthenticatedUser } from "@/lib/auth/server"
import type { Metadata } from "next"
import { Bungee, IBM_Plex_Mono, Permanent_Marker } from "next/font/google"
import "./globals.css"

const display = Bungee({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display"
})
const mono = IBM_Plex_Mono({
  weight: ["400", "600"],
  subsets: ["latin"],
  variable: "--font-mono"
})
const marker = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker"
})

// Every page reads the Neon Auth session cookie, so render on demand.
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "PickFlick",
  description:
    "Swipe through movies with friends and find the perfect film to watch together."
}

export default async function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  const user = await getAuthenticatedUser()

  if (user) {
    const profileRes = await getProfileByUserIdAction(user.id)
    if (!profileRes.isSuccess) {
      await createProfileAction({ userId: user.id })
    }
  }

  return (
    <html
      lang="en"
      className={cn(display.variable, mono.variable, marker.variable)}
    >
      <body className="bg-background mx-auto min-h-[100dvh] w-full scroll-smooth antialiased">
        <Providers>
          <PostHogUserIdentify />
          <PostHogPageview />

          {children}

          <TailwindIndicator />

          <Toaster />
        </Providers>
      </body>
    </html>
  )
}

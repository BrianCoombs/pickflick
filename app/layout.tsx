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
import { createClient } from "@/lib/supabase/server"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

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
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (user) {
    const profileRes = await getProfileByUserIdAction(user.id)
    if (!profileRes.isSuccess) {
      await createProfileAction({ userId: user.id })
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background mx-auto min-h-screen w-full scroll-smooth antialiased",
          inter.className
        )}
      >
        <Providers
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
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

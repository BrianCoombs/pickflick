/*
<ai_context>
This client component identifies the user in PostHog.
</ai_context>
*/

"use client"

import { useUser } from "@/hooks/use-user"
import posthog from "posthog-js"
import { useEffect } from "react"

export function PostHogUserIdentify() {
  const { user } = useUser()

  useEffect(() => {
    if (user?.id) {
      posthog.identify(user.id)
    } else {
      posthog.reset()
    }
  }, [user?.id])

  return null
}

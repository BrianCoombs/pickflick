"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { createMovieSession } from "@/actions/db/movies-actions"
import { SessionSettingsForm } from "@/components/session-settings-form"
import { Paper } from "@/components/store/paper"
import { toast } from "@/hooks/use-toast"
import { defaultFilterPreferences } from "@/lib/sessions/preferences"
import {
  failedWatchlistNames,
  shortPoolMessage,
  type SessionSettings
} from "@/lib/sessions/settings-form"

const INITIAL: SessionSettings = {
  mediaType: "movie",
  matchMode: "first",
  preferences: defaultFilterPreferences()
}

export default function NewSessionPage() {
  const router = useRouter()
  const [submitting, setSubmitting] = useState(false)

  const handleCreateSession = async (settings: SessionSettings) => {
    setSubmitting(true)
    try {
      const result = await createMovieSession(settings)

      if (!result.isSuccess || !result.data) {
        // An empty pool comes back as a message saying what to loosen
        toast({
          title: "Couldn't start the session",
          description: result.message,
          variant: "destructive"
        })
        setSubmitting(false)
        return
      }

      const { sessionId, failed, poolSize, short } = result.data
      toast({
        title: "Session created!",
        description: `Session code: ${sessionId.slice(0, 8).toLowerCase()}`,
        duration: 10000
      })
      if (failed.length > 0) {
        toast({
          title: "Some watchlists didn't load",
          description: `Couldn't load ${failedWatchlistNames(failed, []).join(", ")}. The pool uses the rest.`,
          variant: "destructive"
        })
      }
      if (short) {
        toast({
          title: shortPoolMessage(poolSize, settings.mediaType),
          description: "Loosen the filters in the lobby for more."
        })
      }
      // Stay disabled while the lobby loads
      router.push(`/sessions/${sessionId}`)
    } catch (error) {
      console.error("Failed to create session:", error)
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      })
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-8 pt-4">
      <h1 className="store-heading mb-2 text-3xl sm:text-4xl">New session</h1>
      <p className="text-store-mist mb-6 text-sm">
        Pick what you&apos;re in the mood for, or leave it open. You can change
        this in the lobby, and use watchlists once friends join.
      </p>

      <Paper className="p-5 pb-0 sm:p-6 sm:pb-0">
        <SessionSettingsForm
          initial={INITIAL}
          submitLabel="Create session"
          submitting={submitting}
          onSubmit={handleCreateSession}
        />
      </Paper>
    </div>
  )
}

"use client"

import { Settings2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { updateSessionSettings } from "@/actions/db/movies-actions"
import { getSessionWatchlistOptions } from "@/actions/db/watchlist-actions"
import { SessionSettingsForm } from "@/components/session-settings-form"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import type { SessionPreferences } from "@/lib/sessions/preferences"
import type { MatchMode } from "@/lib/sessions/progress"
import {
  failedWatchlistNames,
  shortPoolMessage,
  type SessionSettings
} from "@/lib/sessions/settings-form"
import { mediaCopy } from "@/lib/titles/copy"
import type { MediaType } from "@/lib/titles/title"
import type { WatchlistSourceRef } from "@/lib/watchlists/combine"

interface SessionSettingsDialogProps {
  sessionId: string
  mediaType: MediaType
  matchMode: MatchMode
  preferences: SessionPreferences
  // "lobby": nobody has swiped, saving just rebuilds the pool.
  // "swiping": saving resets everyone's swipes, so the host confirms first.
  variant: "lobby" | "swiping"
}

// Names for the "didn't load" toast; only fetched when something failed
async function namesForFailed(
  sessionId: string,
  failed: WatchlistSourceRef[]
): Promise<string[]> {
  try {
    const result = await getSessionWatchlistOptions(sessionId)
    return failedWatchlistNames(failed, result.isSuccess ? result.data : [])
  } catch {
    return failedWatchlistNames(failed, [])
  }
}

// Host only: the one button that changes Movies/TV, the ending and the pool
export function SessionSettingsDialog({
  sessionId,
  mediaType,
  matchMode,
  preferences,
  variant
}: SessionSettingsDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  // Settings waiting on the reset confirmation (swiping only)
  const [pending, setPending] = useState<SessionSettings | null>(null)

  const save = async (settings: SessionSettings) => {
    setSaving(true)
    try {
      const result = await updateSessionSettings(sessionId, settings)
      if (!result.isSuccess || !result.data) {
        toast({
          title: "Couldn't save the settings",
          description: result.message,
          variant: "destructive"
        })
        return
      }

      const { failed, poolSize, short, reset } = result.data
      const copy = mediaCopy(settings.mediaType)
      if (failed.length > 0) {
        const names = await namesForFailed(sessionId, failed)
        toast({
          title: "Some watchlists didn't load",
          description: `Couldn't load ${names.join(", ")}. The pool uses the rest.`,
          variant: "destructive"
        })
      }
      if (short) {
        toast({
          title: shortPoolMessage(poolSize, settings.mediaType),
          description: "Loosen the filters for more."
        })
      } else if (failed.length === 0) {
        toast(
          reset
            ? {
                title: "Settings saved",
                description: `Everyone starts over with the new ${copy.plural}.`
              }
            : {
                title: copy.readyToast,
                description: "The pool is set. Start when everyone's in."
              }
        )
      }
      setOpen(false)
      router.refresh()
    } catch (error) {
      console.error("Failed to save session settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (settings: SessionSettings) => {
    if (variant === "swiping") setPending(settings)
    else void save(settings)
  }

  const confirmReset = () => {
    const settings = pending
    setPending(null)
    if (settings) void save(settings)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={next => !saving && setOpen(next)}>
        <DialogTrigger asChild>
          {variant === "lobby" ? (
            <Button size="lg" variant="outline">
              <Settings2 className="size-5" />
              Session settings
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="min-h-11 min-w-11 px-2 shadow-none sm:px-3"
              aria-label="Session settings"
            >
              <Settings2 />
              <span className="hidden sm:inline">Session settings</span>
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="max-h-[90dvh] overflow-y-auto overscroll-contain pb-0 sm:max-w-[480px] sm:pb-0">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle>Session settings</DialogTitle>
            <DialogDescription>
              {variant === "lobby"
                ? "Pick what to watch and how the session ends."
                : "Saving new settings starts the session over for everyone."}
            </DialogDescription>
          </DialogHeader>
          <SessionSettingsForm
            initial={{ mediaType, matchMode, preferences }}
            sessionId={sessionId}
            submitLabel="Save settings"
            submitting={saving}
            onSubmit={handleSubmit}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pending !== null}
        onOpenChange={next => !next && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset everyone&apos;s swipes?</AlertDialogTitle>
            <AlertDialogDescription>
              Saving new settings starts the session over for everyone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep swiping</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReset}>
              Reset and save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

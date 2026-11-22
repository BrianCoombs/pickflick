"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import { updateSessionPreferences } from "@/actions/db/movies-actions"
import {
  getSessionWatchlistOptions,
  type WatchlistOption
} from "@/actions/db/watchlist-actions"
import { toast } from "@/hooks/use-toast"
import { Film, Settings2 } from "lucide-react"
import { MoviePreferencesForm } from "@/components/movie-preferences-form"

interface CriteriaDialogProps {
  sessionId: string
  currentPreferences?: any
  // "lobby": host picking movies before Start (no swipes to lose yet)
  variant?: "lobby" | "swiping"
}

const SOURCE_LABELS = { trakt: "Trakt", letterboxd: "Letterboxd" } as const

export function CriteriaDialog({
  sessionId,
  currentPreferences,
  variant = "swiping"
}: CriteriaDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState<WatchlistOption[] | null>(null)

  const handleOpenChange = async (next: boolean) => {
    setOpen(next)
    if (next) {
      setOptions(null)
      try {
        const result = await getSessionWatchlistOptions(sessionId)
        setOptions(result.isSuccess ? result.data : [])
      } catch (error) {
        console.error("Failed to load watchlist options:", error)
        setOptions([])
      }
    }
  }

  const handleSubmit = async (preferences: any) => {
    setLoading(true)

    try {
      const result = await updateSessionPreferences(sessionId, preferences)

      if (result.isSuccess) {
        const failed = result.data?.failed ?? []
        if (failed.length > 0) {
          const names = failed.map(f => {
            const person = options?.find(o => o.userId === f.userId)
            return `${person?.name ?? "Someone"}'s ${SOURCE_LABELS[f.sourceType]}`
          })
          toast({
            title: "Some watchlists didn't load",
            description: `Couldn't load ${names.join(", ")}. The pool uses the rest.`,
            variant: "destructive"
          })
        } else {
          toast({
            title: variant === "lobby" ? "Movies ready" : "Criteria updated",
            description:
              variant === "lobby"
                ? "The pool is set. Start when everyone's in."
                : "New movies will be loaded based on your preferences"
          })
        }
        setOpen(false)
        if (variant === "lobby") {
          // Nobody has swiped yet: re-render with the new pool, keeping toasts
          router.refresh()
        } else {
          // Reload to reset the swipe deck; give a warning time to be read
          setTimeout(() => window.location.reload(), failed.length ? 4000 : 0)
        }
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update criteria",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {variant === "lobby" ? (
          <Button size="lg" variant="outline" className="font-semibold">
            <Film className="mr-2 size-5" />
            Choose Movies
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 min-w-11 px-2 shadow-none sm:px-3"
            aria-label="Change movies"
          >
            <Settings2 />
            <span className="hidden sm:inline">Change movies</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {variant === "lobby" ? "Choose Movies" : "Update Movie Criteria"}
          </DialogTitle>
          <DialogDescription>
            {variant === "lobby"
              ? "Build the pool from people's watchlists, or from genres and years."
              : "Change your movie preferences. This will clear current swipes and load new movies."}
          </DialogDescription>
        </DialogHeader>
        {options === null ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            Loading...
          </p>
        ) : (
          <MoviePreferencesForm
            mode="update"
            initialPreferences={currentPreferences}
            onSubmit={handleSubmit}
            submitLabel={
              variant === "lobby" ? "Use These Movies" : "Update Criteria"
            }
            loading={loading}
            watchlistOptions={options}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

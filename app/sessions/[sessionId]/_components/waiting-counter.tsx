"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { addMoreMovies, endSessionNow } from "@/actions/db/movies-actions"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"
import { Paper, PaperTitle } from "@/components/store/paper"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { toast } from "@/hooks/use-toast"
import {
  BATCH_SIZE,
  POOL_CAP,
  type MatchMode,
  type NextStep
} from "@/lib/sessions/progress"
import { mediaCopy } from "@/lib/titles/copy"
import type { MediaType } from "@/lib/titles/title"

interface WaitingCounterProps {
  sessionId: string
  mediaType: MediaType
  matchMode: MatchMode
  isHost: boolean
  people: WatchlistOption[]
  progress: { userId: string; remaining: number }[]
  nextStep: NextStep | null
  poolSize: number
  goToResults: () => void
}

// Shown once you've swiped every title in the pool: who's still going, and
// "Add 50 more" when everyone's done and nobody agreed
export function WaitingCounter({
  sessionId,
  mediaType,
  matchMode,
  isHost,
  people,
  progress,
  nextStep,
  poolSize,
  goToResults
}: WaitingCounterProps) {
  const router = useRouter()
  const copy = mediaCopy(mediaType)
  const [adding, setAdding] = useState(false)
  const [ending, setEnding] = useState(false)

  // Nothing matched the settings from the start: keep the old copy
  if (poolSize === 0) {
    return (
      <div className="px-4 pt-6">
        <h1 className="store-heading mb-4 text-3xl">{copy.outOf}</h1>
        <Paper className="text-sm">{copy.noneMatched}</Paper>
      </div>
    )
  }

  const names = new Map(people.map(p => [p.userId, p.name]))
  const rows =
    progress.length > 0
      ? progress.map(p => ({
          userId: p.userId,
          name: names.get(p.userId) ?? "Someone",
          remaining: p.remaining as number | null
        }))
      : people.map(p => ({ userId: p.userId, name: p.name, remaining: null }))

  const offerMore = nextStep === "offer-more"
  const finishing = nextStep === "finish"
  const shelfFull = poolSize >= POOL_CAP
  const canEndNow = matchMode === "all" && isHost && !finishing

  const addMore = async () => {
    if (adding) return
    setAdding(true)
    try {
      const result = await addMoreMovies(sessionId)
      if (!result.isSuccess) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
        return
      }
      const data = result.data
      if ("reason" in data) {
        if (data.reason === "exhausted") {
          toast({
            title: "Shelf's empty",
            description: `No more ${copy.plural} match these settings.`
          })
        } else if (data.reason === "already-added") {
          toast({
            title: "Already restocked",
            description: `Someone else just added more ${copy.plural}.`
          })
        } else if (data.reason === "failed") {
          toast({
            title: "Couldn't restock",
            description: `Loading more ${copy.plural} failed. Try again in a moment.`,
            variant: "destructive"
          })
        } else {
          toast({
            title: "Can't add more now",
            description: "Someone may still be swiping."
          })
        }
      } else {
        toast({
          title: "Restocked",
          description: `${data.added} more ${copy.plural} on the shelf.`
        })
      }
      router.refresh()
    } catch {
      toast({
        title: "Error",
        description: `Couldn't add more ${copy.plural}. Try again.`,
        variant: "destructive"
      })
    } finally {
      setAdding(false)
    }
  }

  const endNow = async () => {
    setEnding(true)
    try {
      const result = await endSessionNow(sessionId)
      if (!result.isSuccess) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
        setEnding(false)
        return
      }
      // Shared with the poll, so only one of them navigates
      goToResults()
    } catch {
      toast({
        title: "Error",
        description: "Couldn't end the session. Try again.",
        variant: "destructive"
      })
      setEnding(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 pt-6">
      <h1 className="store-heading mb-4 text-3xl">
        Waiting at
        <br />
        the counter
      </h1>

      <Paper className="p-3">
        <PaperTitle>Who&apos;s still swiping</PaperTitle>
        <ul>
          {rows.map(row => (
            <li
              key={row.userId}
              className="flex justify-between gap-3 border-b border-dotted border-neutral-400 py-1.5 text-sm last:border-0"
            >
              <span className="min-w-0 truncate">{row.name}</span>
              <span
                className={
                  row.remaining === 0
                    ? "text-store-red-ink shrink-0 font-semibold"
                    : "shrink-0 text-neutral-600"
                }
              >
                {row.remaining === null
                  ? "swiping"
                  : row.remaining === 0
                    ? "done"
                    : `${row.remaining} left`}
              </span>
            </li>
          ))}
        </ul>
      </Paper>

      {offerMore ? (
        <Paper className="mt-4 p-3 text-sm">
          <PaperTitle>Nobody rented the same tape</PaperTitle>
          <p>
            {shelfFull
              ? `That's the whole shelf: ${POOL_CAP} ${copy.plural}. Start a new session to try different settings.`
              : `Everyone's been through all ${poolSize}. Add ${BATCH_SIZE} more ${copy.plural} and keep swiping.`}
          </p>
        </Paper>
      ) : (
        <p className="text-store-mist mt-4 text-sm">
          {finishing
            ? "Everyone's done. Ringing it up..."
            : matchMode === "all"
              ? `You've swiped every ${copy.singular}. When everyone's done, you'll see every match.`
              : `You've swiped every ${copy.singular}. If everyone rents the same one, you'll all see it.`}
        </p>
      )}

      <div className="bg-background sticky bottom-0 mt-auto grid gap-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6">
        {offerMore && !shelfFull && (
          <Button size="lg" onClick={addMore} disabled={adding}>
            {adding ? (
              <>
                <Loader2 className="animate-spin" /> Restocking...
              </>
            ) : (
              `Add ${BATCH_SIZE} more`
            )}
          </Button>
        )}

        {canEndNow && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary" size="lg" disabled={ending}>
                {ending ? "Ending..." : "End now and see matches"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End the session now?</AlertDialogTitle>
                <AlertDialogDescription>
                  Everyone stops swiping and sees the {copy.plural} you&apos;ve
                  all rented so far. That might be none.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep waiting</AlertDialogCancel>
                <AlertDialogAction onClick={endNow}>End now</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {offerMore && (
          <Link
            href="/sessions/new"
            className="text-store-mist mx-auto flex min-h-11 items-center text-sm underline underline-offset-4"
          >
            Start a new session
          </Link>
        )}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { Trash2 } from "lucide-react"
import { swipeMovie } from "@/actions/db/movies-actions"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"
import { Sticker } from "@/components/store/sticker"
import { Button } from "@/components/ui/button"
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
import { toast } from "@/hooks/use-toast"
import { TMDbAPI, type Movie } from "@/lib/api/tmdb"
import { swipeDecision } from "@/lib/store/swipe"
import { CriteriaDialog } from "./criteria-dialog"
import { Lobby } from "./lobby"
import { useSessionControls } from "./use-session-controls"

type Direction = "left" | "right"

interface SwipeInterfaceProps {
  sessionId: string
  movies: Movie[]
  participantCount: number
  sessionStarted: boolean
  isHost: boolean
  people: WatchlistOption[]
  preferences?: any
}

export default function SwipeInterface(props: SwipeInterfaceProps) {
  if (!props.sessionStarted) {
    return (
      <Lobby
        sessionId={props.sessionId}
        isHost={props.isHost}
        participantCount={props.participantCount}
        people={props.people}
        preferences={props.preferences}
      />
    )
  }
  return <Swiper {...props} />
}

function Swiper({
  sessionId,
  movies,
  participantCount,
  isHost,
  preferences
}: SwipeInterfaceProps) {
  const router = useRouter()
  const { deleting, deleteSession } = useSessionControls(sessionId)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // The card follows the finger; it leans and shows a stamp as it moves
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-14, 14])
  const passOpacity = useTransform(x, [-110, -20], [1, 0])
  const rentOpacity = useTransform(x, [20, 110], [0, 1])

  const currentMovie = movies[currentIndex]

  const swipe = async (direction: Direction) => {
    // A ref, not just state, so a double tap in the same frame can't sneak in
    if (busyRef.current || !currentMovie) return
    busyRef.current = true
    setBusy(true)

    const width = cardRef.current?.offsetWidth ?? 320
    await animate(x, direction === "right" ? width * 1.6 : -width * 1.6, {
      duration: 0.25
    })

    try {
      const result = await swipeMovie(
        sessionId,
        currentMovie.id.toString(),
        direction
      )
      if (!result.isSuccess) throw new Error(result.message)

      if (result.data.matched) {
        router.push(`/sessions/${sessionId}/match`)
        return
      }
      setCurrentIndex(index => index + 1)
      x.set(0)
    } catch {
      toast({
        title: "Error",
        description: "That swipe didn't save. Try again.",
        variant: "destructive"
      })
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 })
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") swipe("left")
      if (e.key === "ArrowRight") swipe("right")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const statusBar = (
    <div className="flex items-center justify-between gap-2 px-4 pb-2 text-xs">
      <span className="text-store-mist whitespace-nowrap">
        {participantCount} swiping
        {currentMovie && (
          <>
            {" "}
            · {currentIndex + 1} / {movies.length}
          </>
        )}
      </span>
      <div className="flex items-center gap-2">
        <CriteriaDialog
          sessionId={sessionId}
          currentPreferences={preferences}
        />
        {isHost && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Delete session">
                <Trash2 className="size-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes the session and everyone&apos;s swipes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSession} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )

  if (!currentMovie) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {statusBar}
        <div className="px-4 pt-6">
          <h1 className="store-heading mb-4 text-3xl">
            Out of
            <br />
            movies
          </h1>
          <div className="paper p-4 text-sm">
            {movies.length === 0
              ? "No movies matched. Try different genres or watchlists."
              : "You've swiped on every movie in this pool. Nobody matched yet, so try a new pool or wait for the others to finish."}
          </div>
        </div>
      </div>
    )
  }

  const posterUrl = TMDbAPI.getPosterUrl(currentMovie.poster_path)
  const releaseYear = currentMovie.release_date
    ? new Date(currentMovie.release_date).getFullYear()
    : null
  const genre = currentMovie.genres?.[0]?.name
  const meta = [releaseYear, genre].filter(Boolean).join(" · ")

  return (
    <div className="mx-auto flex h-[calc(100dvh-56px)] w-full max-w-md flex-col overflow-hidden">
      {statusBar}

      {/* Poster in a clamshell case */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6">
        <motion.div
          key={currentMovie.id}
          ref={cardRef}
          drag={busy ? false : "x"}
          dragElastic={0.9}
          dragMomentum={false}
          style={{ x, rotate, touchAction: "pan-y" }}
          onDragEnd={(_, info) => {
            const width = cardRef.current?.offsetWidth ?? 320
            const decision = swipeDecision(
              info.offset.x,
              info.velocity.x,
              width
            )
            if (decision) swipe(decision)
            else animate(x, 0, { type: "spring", stiffness: 400, damping: 30 })
          }}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-store-tape relative aspect-[2/3] h-full max-h-full max-w-full cursor-grab select-none rounded-[3px] p-2 active:cursor-grabbing"
        >
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={currentMovie.title}
              draggable={false}
              className="size-full object-cover"
            />
          ) : (
            <div className="bg-store-tape-edge flex size-full items-end p-3">
              <span className="font-display text-xl text-white">
                {currentMovie.title}
              </span>
            </div>
          )}

          <Sticker className="absolute -right-2 -top-2 rotate-6 text-sm">
            ★ {currentMovie.vote_average.toFixed(1)}
          </Sticker>

          {/* Stamps that fade in while dragging */}
          <motion.span
            style={{ opacity: passOpacity }}
            className="font-display bg-store-paper text-store-navy border-store-navy pointer-events-none absolute right-4 top-6 rotate-12 border-4 px-3 py-1 text-2xl"
          >
            PASS
          </motion.span>
          <motion.span
            style={{ opacity: rentOpacity }}
            className="font-display bg-store-yellow text-store-navy border-store-red pointer-events-none absolute left-4 top-6 -rotate-12 border-4 px-3 py-1 text-2xl"
          >
            RENT IT
          </motion.span>
        </motion.div>
      </div>

      <div className="px-6 pt-3 text-xs leading-snug">
        <div className="font-display text-store-yellow truncate text-base">
          {currentMovie.title}
        </div>
        {meta && <div className="text-store-mist">{meta}</div>}
        <p className="mt-1 line-clamp-2">{currentMovie.overview}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => swipe("left")}
          disabled={busy}
        >
          Pass
        </Button>
        <Button size="lg" onClick={() => swipe("right")} disabled={busy}>
          Rent it
        </Button>
      </div>
    </div>
  )
}

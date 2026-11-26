"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react"
import Link from "next/link"
import { animate, motion, useMotionValue, useTransform } from "framer-motion"
import { Trash2 } from "lucide-react"
import { swipeMovie } from "@/actions/db/movies-actions"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"
import { AgreedSoFar } from "@/components/store/agreed-so-far"
import { HowItWorksButton } from "@/components/store/how-it-works"
import { Paper } from "@/components/store/paper"
import { ResetNotice } from "@/components/store/reset-notice"
import { SessionTermsButton } from "@/components/store/session-terms"
import { Sticker } from "@/components/store/sticker"
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
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle
} from "@/components/ui/sheet"
import { toast } from "@/hooks/use-toast"
import { TMDbAPI } from "@/lib/api/tmdb"
import {
  addConfirmed,
  confirmedFor,
  emptyConfirmed
} from "@/lib/sessions/confirmed-swipes"
import type { SessionPreferences } from "@/lib/sessions/preferences"
import {
  nextCard,
  type MatchMode,
  type NextStep
} from "@/lib/sessions/progress"
import { swipeKeyDirection } from "@/lib/store/keys"
import { swipeDecision } from "@/lib/store/swipe"
import { boxBackLine, cardMetaLine, titlesForIds } from "@/lib/titles/card"
import { mediaCopy } from "@/lib/titles/copy"
import type { MediaType, Title } from "@/lib/titles/title"
import { Lobby } from "./lobby"
import { SessionSettingsDialog } from "./session-settings-dialog"
import { useSessionControls } from "./use-session-controls"
import { WaitingCounter } from "./waiting-counter"

type Direction = "left" | "right"

interface SwipeInterfaceProps {
  sessionId: string
  titles: Title[]
  mediaType: MediaType
  matchMode: MatchMode
  poolVersion: number
  resetVersion: number
  preferences: SessionPreferences
  poolSize: number
  // This person's saved swipes when the page loaded (swipes.movie_id, varchar)
  swipedIds: string[]
  isHost: boolean
  people: WatchlistOption[]
  // From the participants poll
  participantCount: number
  sessionStarted: boolean
  progress: { userId: string; remaining: number }[]
  nextStep: NextStep | null
  agreedIds: string[]
  wasReset: boolean
  acknowledgeReset: () => void
  // The host deleted the session
  deleted: boolean
  // Sends this person to the results once, however the session ended
  goToResults: () => void
}

interface SwiperProps extends SwipeInterfaceProps {
  confirmedIds: ReadonlySet<string>
  onConfirmed: (id: string, swipedAt: number) => void
}

export default function SwipeInterface(props: SwipeInterfaceProps) {
  const { resetVersion } = props
  // Kept here, above the keyed Swiper, so a swipe that lands while the deck
  // remounts still counts. A host reset clears them.
  const [confirmed, setConfirmed] = useState(() => emptyConfirmed(resetVersion))
  const resetVersionRef = useRef(resetVersion)
  useEffect(() => {
    resetVersionRef.current = resetVersion
  }, [resetVersion])
  const onConfirmed = useCallback((id: string, swipedAt: number) => {
    setConfirmed(prev =>
      addConfirmed(prev, swipedAt, resetVersionRef.current, id)
    )
  }, [])

  if (props.deleted) {
    return (
      <div className="mx-auto w-full max-w-md px-4 pt-6">
        <h1 className="store-heading mb-4 text-3xl">
          Session
          <br />
          closed
        </h1>
        <Paper className="text-sm">
          This session was deleted. The host closed it.
        </Paper>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link href="/sessions">Back to sessions</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      {props.sessionStarted ? (
        // A new pool (settings changed, or more titles added) remounts the
        // Swiper with the server's swipes for it
        <Swiper
          key={props.poolVersion}
          {...props}
          confirmedIds={confirmedFor(confirmed, resetVersion)}
          onConfirmed={onConfirmed}
        />
      ) : (
        <Lobby
          sessionId={props.sessionId}
          isHost={props.isHost}
          participantCount={props.participantCount}
          people={props.people}
          preferences={props.preferences}
          mediaType={props.mediaType}
          matchMode={props.matchMode}
          poolSize={props.poolSize}
        />
      )}
      <ResetNotice
        open={props.wasReset}
        onAcknowledge={props.acknowledgeReset}
      />
    </>
  )
}

function Swiper({
  sessionId,
  titles,
  mediaType,
  matchMode,
  preferences,
  poolSize,
  swipedIds,
  isHost,
  people,
  participantCount,
  progress,
  nextStep,
  agreedIds,
  resetVersion,
  goToResults,
  confirmedIds,
  onConfirmed
}: SwiperProps) {
  const { deleting, deleteSession } = useSessionControls(sessionId)
  const copy = mediaCopy(mediaType)
  const [brokenPosterKey, setBrokenPosterKey] = useState<string | null>(null)
  // The title whose back-of-the-box sheet is open. It only counts while that
  // title is still the current card, so any swipe closes it.
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Refs, not just state, so a double tap or a fast second key press in the
  // same frame can't sneak in. doneRef holds ids the server confirmed during
  // this mount, ahead of the re-render that moves to the next card.
  const busyRef = useRef(false)
  const doneRef = useRef(new Set<string>())
  const cardRef = useRef<HTMLDivElement>(null)

  // The card follows the finger; it leans and shows a stamp as it moves
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-14, 14])
  const passOpacity = useTransform(x, [-110, -20], [1, 0])
  const rentOpacity = useTransform(x, [20, 110], [0, 1])

  // Resume at the first title this person hasn't swiped. The page's
  // swipedIds can lag behind (a refresh that lands mid-swipe), so the card
  // comes from both.
  const { index, position, total } = nextCard(
    titles.map(t => t.id),
    [...swipedIds, ...confirmedIds]
  )
  const current: Title | null = index === -1 ? null : titles[index]
  const sheetOpen = current !== null && expandedKey === current.key

  const agreed = useMemo(
    () => (matchMode === "all" ? titlesForIds(titles, agreedIds) : []),
    [matchMode, titles, agreedIds]
  )

  // Once the next card is current: re-centre before it paints (setting x in
  // swipe() would move the old card back to the middle for a frame) and only
  // then let the next swipe in, so it can't land on the old card
  const currentKey = current?.key
  useLayoutEffect(() => {
    x.set(0)
    busyRef.current = false
    setBusy(false)
  }, [currentKey, x])

  const swipe = async (direction: Direction) => {
    if (busyRef.current || !current) return
    const id = String(current.id)
    // Already swiped: a key press handled before the next card rendered
    if (doneRef.current.has(id) || confirmedIds.has(id)) return
    busyRef.current = true
    setBusy(true)
    const swipedAt = resetVersion

    const width = cardRef.current?.offsetWidth ?? 320
    await animate(x, direction === "right" ? width * 1.6 : -width * 1.6, {
      duration: 0.25
    })

    try {
      const result = await swipeMovie(sessionId, id, direction)
      if (!result.isSuccess) throw new Error(result.message)
      doneRef.current.add(id)

      // The session is over: a first-mode match, or the last swipe of an
      // all-mode session. Stay locked while the results load.
      if (result.data.matched) {
        goToResults()
        return
      }
      // All mode, or no match yet: on to the next card, whose layout effect
      // releases the lock
      onConfirmed(id, swipedAt)
    } catch {
      toast({
        title: "Error",
        description: "That swipe didn't save. Try again.",
        variant: "destructive"
      })
      animate(x, 0, { type: "spring", stiffness: 400, damping: 30 })
      busyRef.current = false
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const direction = swipeKeyDirection(
        {
          key: e.key,
          repeat: e.repeat,
          altKey: e.altKey,
          ctrlKey: e.ctrlKey,
          metaKey: e.metaKey,
          shiftKey: e.shiftKey,
          defaultPrevented: e.defaultPrevented,
          targetTag: target?.tagName ?? "",
          targetEditable: target?.isContentEditable ?? false
        },
        // Sheets (back of the box, how it works, ...) are dialogs too. One
        // that's animating closed is still in the page, so only open ones count.
        document.querySelector(
          "[role=dialog][data-state=open], [role=alertdialog][data-state=open]"
        ) !== null
      )
      if (direction) swipe(direction)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const statusBar = (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 px-4 pb-2 text-xs">
      <span className="text-store-mist whitespace-nowrap">
        {participantCount} swiping
        {current && (
          <>
            {" "}
            · {position} / {total}
          </>
        )}
      </span>
      <div className="ml-auto flex items-center gap-1">
        {matchMode === "all" && <AgreedSoFar titles={agreed} />}
        <HowItWorksButton
          matchMode={matchMode}
          mediaType={mediaType}
          poolSize={poolSize}
        />
        {isHost ? (
          <>
            <SessionSettingsDialog
              sessionId={sessionId}
              mediaType={mediaType}
              matchMode={matchMode}
              preferences={preferences}
              variant="swiping"
            />
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
                  <AlertDialogAction
                    onClick={deleteSession}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : (
          <SessionTermsButton
            mediaType={mediaType}
            matchMode={matchMode}
            preferences={preferences}
            poolSize={poolSize}
            people={people}
          />
        )}
      </div>
    </div>
  )

  // Every card swiped (or nothing loaded): wait for the others, add more or
  // end, depending on where everyone is
  if (!current) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        {statusBar}
        <WaitingCounter
          sessionId={sessionId}
          mediaType={mediaType}
          matchMode={matchMode}
          isHost={isHost}
          people={people}
          progress={progress}
          nextStep={nextStep}
          poolSize={poolSize}
          goToResults={goToResults}
        />
      </div>
    )
  }

  const posterUrl =
    brokenPosterKey === current.key
      ? null
      : TMDbAPI.getPosterUrl(current.posterPath)
  const meta = cardMetaLine(current)

  return (
    <div className="mx-auto flex h-[calc(100dvh-60px)] w-full max-w-md flex-col overflow-hidden">
      {statusBar}

      {/* Poster in a clamshell case */}
      {/* A size container, so the case can fit 2:3 inside whichever of
          width or height runs out first */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 [container-type:size]">
        <motion.div
          key={current.key}
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
          className="bg-store-tape relative aspect-[2/3] w-[min(100cqw,calc(100cqh*2/3))] cursor-grab select-none rounded-[3px] p-2 active:cursor-grabbing"
        >
          {posterUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={posterUrl}
              alt={current.name}
              draggable={false}
              onError={() => setBrokenPosterKey(current.key)}
              className="size-full object-cover"
            />
          ) : (
            <div className="bg-store-tape-edge flex size-full items-end p-3">
              <span className="font-display min-w-0 break-words text-xl text-white">
                {current.name}
              </span>
            </div>
          )}

          {current.mediaType === "tv" && (
            <Sticker className="bg-store-yellow absolute -left-2 -top-2 -rotate-6 text-sm">
              BOX SET
            </Sticker>
          )}
          <Sticker className="absolute -right-2 -top-2 rotate-6 text-sm">
            ★ {current.rating.toFixed(1)}
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

      {/* Outside the draggable case, so the link never starts a drag */}
      <div className="px-6 pt-3 text-xs leading-snug">
        <div className="font-display text-store-yellow truncate text-base">
          {current.name}
        </div>
        {(meta || current.overview) && (
          <div className="flex min-h-11 items-center justify-between gap-2">
            <span className="text-store-mist min-w-0 truncate">{meta}</span>
            {current.overview && (
              <button
                type="button"
                onClick={() => setExpandedKey(current.key)}
                className="text-store-ink focus-visible:ring-ring min-h-11 shrink-0 whitespace-nowrap font-mono underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2"
              >
                Back of the box ▸
              </button>
            )}
          </div>
        )}
        {current.overview && <p className="line-clamp-2">{current.overview}</p>}
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

      <BackOfTheBox
        title={current}
        kind={copy.singular}
        open={sheetOpen}
        onOpenChange={open => setExpandedKey(open ? current.key : null)}
      />
    </div>
  )
}

// The full description, like reading the back of a rental case. A bottom
// sheet, so it covers the poster and buttons instead of pushing the layout.
function BackOfTheBox({
  title,
  kind,
  open,
  onOpenChange
}: {
  title: Title
  kind: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const line = boxBackLine(title)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-store-paper text-store-navy border-store-navy shadow-offset-black mx-auto flex max-h-[70dvh] max-w-md flex-col gap-0 rounded-none border-t-2 border-dashed p-0"
      >
        <div className="overflow-y-auto px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-5">
          <SheetTitle className="font-display text-store-navy pr-8 text-xl leading-tight">
            {title.name}
          </SheetTitle>
          {title.tagline && (
            <p className="font-marker text-store-red-ink mt-1 text-base">
              {title.tagline}
            </p>
          )}
          <SheetDescription className="sr-only">
            The full description of this {kind}
          </SheetDescription>
          {line && <p className="mt-2 text-xs">{line}</p>}
          {title.overview && (
            <p className="mt-3 text-sm leading-relaxed">{title.overview}</p>
          )}
          <SheetClose asChild>
            <Button variant="default" className="mt-4 w-full">
              Put it back
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}

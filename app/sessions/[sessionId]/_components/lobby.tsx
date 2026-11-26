"use client"

import { useEffect, useState } from "react"
import { Copy, Share2 } from "lucide-react"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"
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
import { HowItWorks } from "@/components/store/how-it-works"
import { SessionTerms } from "@/components/store/session-terms"
import type { SessionPreferences } from "@/lib/sessions/preferences"
import type { MatchMode } from "@/lib/sessions/progress"
import { linkedListLabel, peopleCount } from "@/lib/store/format"
import type { MediaType } from "@/lib/titles/title"
import { SessionSettingsDialog } from "./session-settings-dialog"
import { useSessionControls } from "./use-session-controls"

interface LobbyProps {
  sessionId: string
  isHost: boolean
  participantCount: number
  people: WatchlistOption[]
  preferences: SessionPreferences
  mediaType: MediaType
  matchMode: MatchMode
  poolSize: number
}

// The waiting screen before the host presses Start
export function Lobby({
  sessionId,
  isHost,
  participantCount,
  people,
  preferences,
  mediaType,
  matchMode,
  poolSize
}: LobbyProps) {
  const {
    shortCode,
    deleting,
    starting,
    startSession,
    deleteSession,
    copyCode,
    shareSession
  } = useSessionControls(sessionId)
  // Read after mount so server and client render the same HTML
  const [host, setHost] = useState("")
  useEffect(() => setHost(window.location.host), [])

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <h1 className="store-heading mb-4 text-3xl">
        {isHost ? (
          <>
            Waiting for
            <br />
            everyone
          </>
        ) : (
          <>
            Waiting for
            <br />
            the host
          </>
        )}
      </h1>

      {/* Rental card with the code */}
      <div className="paper border-store-navy mb-4 border-2 border-dashed p-3">
        <div className="text-store-red-ink text-[10px] font-semibold tracking-widest">
          SESSION CODE
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-display text-3xl tracking-wide">
            {shortCode}
          </span>
          <div className="flex">
            <button
              onClick={copyCode}
              className="flex size-11 items-center justify-center"
              aria-label="Copy code"
            >
              <Copy className="size-5" />
            </button>
            <button
              onClick={shareSession}
              className="flex size-11 items-center justify-center"
              aria-label="Share session"
            >
              <Share2 className="size-5" />
            </button>
          </div>
        </div>
        <div className="text-xs text-neutral-600">
          Friends join at {host || "PickFlick"}/sessions/join
        </div>
      </div>

      {/* Who's here and which lists they've linked */}
      <div className="paper p-3">
        <div className="font-display mb-1 text-sm">
          At the counter · {participantCount}
        </div>
        {people.length > 0 ? (
          <ul>
            {people.map(person => (
              <li
                key={person.userId}
                className="flex justify-between gap-3 border-b border-dotted border-neutral-400 py-1.5 text-sm last:border-0"
              >
                <span className="min-w-0 truncate">{person.name}</span>
                <span className="shrink-0 text-neutral-600">
                  {linkedListLabel(person.sources)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-1.5 text-sm text-neutral-600">
            {peopleCount(participantCount)}
          </p>
        )}
      </div>

      {/* The rules and the settings, so nobody has to ask the host */}
      <div className="mt-4 grid gap-4">
        <HowItWorks
          matchMode={matchMode}
          mediaType={mediaType}
          poolSize={poolSize}
        />
        <SessionTerms
          mediaType={mediaType}
          matchMode={matchMode}
          preferences={preferences}
          poolSize={poolSize}
          people={people}
        />
      </div>

      {!isHost && (
        <p className="text-store-mist mt-4 text-sm">
          The host starts the session when everyone&apos;s in.
        </p>
      )}

      {isHost && (
        <div className="mt-auto grid gap-3 pt-6 md:mt-4">
          <SessionSettingsDialog
            sessionId={sessionId}
            mediaType={mediaType}
            matchMode={matchMode}
            preferences={preferences}
            variant="lobby"
          />
          <Button size="lg" onClick={startSession} disabled={starting}>
            {starting ? "Starting..." : "Start"}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="text-store-mist mx-auto min-h-11 text-sm underline underline-offset-4">
                Cancel session
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                <AlertDialogDescription>
                  This deletes the session for everyone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep waiting</AlertDialogCancel>
                <AlertDialogAction onClick={deleteSession} disabled={deleting}>
                  {deleting ? "Cancelling..." : "Cancel session"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

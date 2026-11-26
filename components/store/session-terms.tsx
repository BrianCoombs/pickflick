"use client"

import { Info } from "lucide-react"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"
import { Paper, PaperTitle } from "@/components/store/paper"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import type { SessionPreferences } from "@/lib/sessions/preferences"
import type { MatchMode } from "@/lib/sessions/progress"
import { describeSessionSettings } from "@/lib/sessions/settings"
import type { MediaType } from "@/lib/titles/title"

interface SessionTermsProps {
  mediaType: MediaType
  matchMode: MatchMode
  preferences: SessionPreferences
  poolSize: number
  people: WatchlistOption[]
}

// Read-only "Rental terms": the session's settings on label paper
export function SessionTerms({
  mediaType,
  matchMode,
  preferences,
  poolSize,
  people
}: SessionTermsProps) {
  const rows = describeSessionSettings(
    { matchMode, mediaType, preferences, poolLength: poolSize },
    people
  )

  return (
    <Paper className="p-3">
      <PaperTitle>Rental terms</PaperTitle>
      <dl className="text-sm">
        {rows.map(row => (
          <div
            key={row.label}
            className="flex justify-between gap-3 border-b border-dotted border-neutral-400 py-1.5 last:border-0"
          >
            <dt className="shrink-0 text-neutral-600">{row.label}</dt>
            <dd className="min-w-0 text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Paper>
  )
}

// Non-hosts on the swipe screen: an Info button opening the terms from below
export function SessionTermsButton(props: SessionTermsProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Session settings">
          <Info className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85dvh] overflow-y-auto border-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12"
      >
        <SheetTitle className="sr-only">Rental terms</SheetTitle>
        <div className="mx-auto max-w-md">
          <SessionTerms {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

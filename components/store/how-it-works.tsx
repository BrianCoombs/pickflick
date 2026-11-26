"use client"

import { CircleHelp } from "lucide-react"
import { Paper, PaperTitle } from "@/components/store/paper"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import type { MatchMode } from "@/lib/sessions/progress"
import { BATCH_SIZE } from "@/lib/sessions/progress"
import { mediaCopy } from "@/lib/titles/copy"
import type { MediaType } from "@/lib/titles/title"

interface HowItWorksProps {
  matchMode: MatchMode
  mediaType: MediaType
  poolSize: number
}

// The rules in four short lines, for the lobby and the "?" sheet
export function HowItWorks({
  matchMode,
  mediaType,
  poolSize
}: HowItWorksProps) {
  const copy = mediaCopy(mediaType)
  const ending =
    matchMode === "all"
      ? `Everyone swipes all ${poolSize} ${copy.plural}. Then you get the list of every ${copy.singular} you all rented.`
      : `The first ${copy.singular} everyone rents ends the session. That's tonight's pick.`

  const steps = [
    {
      mark: "→",
      text: (
        <>
          Swipe right (or tap <b>Rent it</b>) on a {copy.singular} you&apos;d
          watch. Swipe left to pass.
        </>
      )
    },
    { mark: "★", text: ending },
    {
      mark: "+",
      text: `If nobody agrees on anything, anyone can add ${BATCH_SIZE} more.`
    },
    {
      mark: "↺",
      text: "Your swipes are saved. Refresh or rejoin and you pick up where you left off."
    }
  ]

  return (
    <Paper className="p-3">
      <PaperTitle>How it works</PaperTitle>
      <ol className="grid gap-2 text-sm leading-snug">
        {steps.map(step => (
          <li key={step.mark} className="flex gap-2">
            <span
              aria-hidden
              className="font-display text-store-red-ink w-4 shrink-0 text-center"
            >
              {step.mark}
            </span>
            <span className="min-w-0">{step.text}</span>
          </li>
        ))}
      </ol>
    </Paper>
  )
}

// "?" in the swipe screen's status bar, opening the same rules from the bottom
export function HowItWorksButton(props: HowItWorksProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="How it works">
          <CircleHelp className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85dvh] overflow-y-auto border-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12"
      >
        <SheetTitle className="sr-only">How it works</SheetTitle>
        <div className="mx-auto max-w-md">
          <HowItWorks {...props} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

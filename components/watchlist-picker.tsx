"use client"

import Link from "next/link"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"

const SOURCE_LABELS = { trakt: "Trakt", letterboxd: "Letterboxd" } as const

export const sourceKey = (userId: string, sourceType: string) =>
  `${userId}:${sourceType}`

interface WatchlistPickerProps {
  options: WatchlistOption[]
  selected: Set<string>
  onToggle: (key: string) => void
}

export function WatchlistPicker({
  options,
  selected,
  onToggle
}: WatchlistPickerProps) {
  return (
    <div className="space-y-3">
      <Label className="text-base">Whose watchlists?</Label>
      <ul className="space-y-2">
        {options.map(person => (
          <li
            key={person.userId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
          >
            <span
              className={
                person.sources.length === 0 ? "text-muted-foreground" : ""
              }
            >
              {person.name}
            </span>
            {person.sources.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                No watchlist linked
              </span>
            ) : (
              <div className="flex gap-4">
                {person.sources.map(source => {
                  const key = sourceKey(person.userId, source.sourceType)
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`wl-${key}`}
                        checked={selected.has(key)}
                        onCheckedChange={() => onToggle(key)}
                      />
                      <Label
                        htmlFor={`wl-${key}`}
                        className="cursor-pointer text-sm font-normal"
                      >
                        {SOURCE_LABELS[source.sourceType]}
                      </Label>
                    </div>
                  )
                })}
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        The pool mixes every movie on the lists you tick. People link their
        lists on their{" "}
        <Link href="/settings" className="underline underline-offset-2">
          profile
        </Link>
        .
      </p>
    </div>
  )
}

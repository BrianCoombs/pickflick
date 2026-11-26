"use client"

import Link from "next/link"
import type { WatchlistOption } from "@/actions/db/watchlist-actions"
import { ToggleChip } from "@/components/store/toggle-chip"
import { sourceKey } from "@/lib/sessions/settings-form"
import { mediaCopy } from "@/lib/titles/copy"
import { allowedSourceTypes } from "@/lib/titles/sources"
import type { MediaType } from "@/lib/titles/title"

const SOURCE_LABELS = { trakt: "Trakt", letterboxd: "Letterboxd" } as const

export { sourceKey }

interface WatchlistPickerProps {
  options: WatchlistOption[]
  selected: Set<string>
  onToggle: (key: string) => void
  mediaType: MediaType
}

export function WatchlistPicker({
  options,
  selected,
  onToggle,
  mediaType
}: WatchlistPickerProps) {
  // Letterboxd only lists films, so it's hidden for TV
  const allowed = allowedSourceTypes(mediaType)

  return (
    <section aria-labelledby="watchlists-heading" className="space-y-3">
      <h3
        id="watchlists-heading"
        className="font-display text-store-navy text-sm uppercase"
      >
        Whose watchlists?
      </h3>
      <ul className="space-y-2">
        {options.map(person => {
          const sources = person.sources.filter(s =>
            allowed.includes(s.sourceType)
          )
          return (
            <li
              key={person.userId}
              className="border-store-navy/30 flex flex-wrap items-center justify-between gap-2 border-2 p-2 pl-3"
            >
              <span
                className={
                  sources.length === 0 ? "text-neutral-600" : "font-semibold"
                }
              >
                {person.name}
              </span>
              {sources.length === 0 ? (
                <span className="text-sm text-neutral-600">
                  No watchlist linked
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {sources.map(source => {
                    const key = sourceKey(person.userId, source.sourceType)
                    return (
                      <ToggleChip
                        key={key}
                        pressed={selected.has(key)}
                        onPressedChange={() => onToggle(key)}
                      >
                        {SOURCE_LABELS[source.sourceType]}
                      </ToggleChip>
                    )
                  })}
                </div>
              )}
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-neutral-600">
        {mediaCopy(mediaType).pickerBlurb} People link their lists on their{" "}
        <Link href="/settings" className="underline underline-offset-2">
          profile
        </Link>
        .
      </p>
    </section>
  )
}

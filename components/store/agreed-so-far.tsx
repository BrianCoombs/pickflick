"use client"

import { Paper, PaperTitle } from "@/components/store/paper"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet"
import { TMDbAPI } from "@/lib/api/tmdb"
import type { Title } from "@/lib/titles/title"

// All mode: a chip counting the titles everyone has rented so far, opening
// a list of them. The caller decides whether to render it.
export function AgreedSoFar({ titles }: { titles: Title[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex min-h-11 items-center"
          aria-label={`Agreed so far: ${titles.length}. Show the list`}
        >
          <span className="font-marker bg-store-pink inline-block -rotate-2 whitespace-nowrap px-2 py-0.5 text-xs leading-tight text-black">
            Agreed so far: {titles.length}
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        className="max-h-[85dvh] overflow-y-auto border-0 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-12"
      >
        <SheetTitle className="sr-only">Agreed so far</SheetTitle>
        <Paper className="mx-auto max-w-md p-3">
          <PaperTitle>Agreed so far · {titles.length}</PaperTitle>
          {titles.length === 0 ? (
            <p className="py-1.5 text-sm text-neutral-600">Nothing yet</p>
          ) : (
            <ul>
              {titles.map(title => {
                const poster = TMDbAPI.getPosterUrl(title.posterPath, "w200")
                return (
                  <li
                    key={title.key}
                    className="flex items-center gap-3 border-b border-dotted border-neutral-400 py-2 last:border-0"
                  >
                    {poster ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={poster}
                        alt=""
                        className="bg-store-tape aspect-[2/3] w-10 shrink-0 object-cover"
                      />
                    ) : (
                      <div className="bg-store-tape aspect-[2/3] w-10 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1 text-sm">
                      <div className="font-display truncate leading-tight">
                        {title.name}
                      </div>
                      {title.year && (
                        <div className="text-xs text-neutral-600">
                          {title.year}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs">
                      ★ {title.rating.toFixed(1)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Paper>
      </SheetContent>
    </Sheet>
  )
}

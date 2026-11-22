/*
<ai_context>
This client component provides the hero section for the landing page.
</ai_context>
*/

"use client"

import { Button } from "@/components/ui/button"
import { Sticker } from "@/components/store/sticker"
import { Shelf, TapeSpine } from "@/components/store/tape-spine"
import { useUser } from "@/hooks/use-user"
import Link from "next/link"
import posthog from "posthog-js"

export const HeroSection = () => {
  const { user } = useUser()

  return (
    <section className="mx-auto max-w-screen-lg px-4 pb-10 pt-8 md:pt-16">
      <h1 className="store-heading text-4xl sm:text-5xl md:text-7xl">
        What are
        <br />
        we watching?
      </h1>
      <p className="mt-4 max-w-md text-base md:text-lg">
        Swipe with your friends until you all like the same movie.
      </p>

      <Button asChild size="lg" className="mt-6">
        <Link
          href={user ? "/sessions/new" : "/signup"}
          onClick={() => posthog.capture("clicked_get_started")}
        >
          Start a session
        </Link>
      </Button>

      <Shelf className="mt-10 gap-2.5">
        <TapeSpine title="Heat (1995)" className="h-28 w-14" />
        <TapeSpine title="Paddington 2" className="h-28 w-14" />
        <TapeSpine title="Alien" className="h-28 w-14" />
        <Link
          href={user ? "/settings" : "/signup"}
          className="ml-2 self-center"
        >
          <Sticker className="max-w-[200px]">
            New: pull movies from your watchlists
          </Sticker>
        </Link>
      </Shelf>
    </section>
  )
}

import Link from "next/link"
import { redirect } from "next/navigation"
import {
  getActiveSessions,
  getRecentMatches
} from "@/actions/db/movies-actions"
import { Sticker } from "@/components/store/sticker"
import { Shelf, TapeSpine } from "@/components/store/tape-spine"
import { VhsCase } from "@/components/store/vhs-case"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { peopleCount } from "@/lib/store/format"
import { parseMediaType } from "@/lib/titles/title"
import { cn } from "@/lib/utils"

// Small "TV" tag for TV sessions, like a box-set label
function TvMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display bg-store-yellow text-store-navy px-1 text-[9px] leading-tight",
        className
      )}
    >
      TV
    </span>
  )
}

export default async function SessionsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const [sessionsResult, matchesResult] = await Promise.all([
    getActiveSessions(),
    getRecentMatches()
  ])
  // Lobby sessions and ones already swiping ("started")
  const activeSessions: {
    id: string
    userIds: string[]
    mediaType: string
    status?: string
  }[] = sessionsResult.isSuccess ? sessionsResult.data : []
  const recentMatches = matchesResult.isSuccess ? matchesResult.data : []

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-4">
      <h1 className="store-heading mb-6 text-3xl sm:text-4xl">
        What are
        <br />
        we watching?
      </h1>

      <div className="space-y-4">
        <VhsCase
          href="/sessions/new"
          title="New session"
          subtitle="Start one and send friends the code."
          sticker={<Sticker className="text-xs">New</Sticker>}
        />
        <VhsCase
          href="/sessions/join"
          title="Join with a code"
          subtitle="Got a code from a friend?"
        />
        {activeSessions.map(session => (
          <VhsCase
            key={session.id}
            href={`/sessions/${session.id}`}
            title={`Session ${session.id.slice(0, 8)}`}
            subtitle={
              <>
                {parseMediaType(session.mediaType) === "tv" && (
                  <TvMark className="mr-1.5 align-middle" />
                )}
                {session.status === "started"
                  ? "Swiping now"
                  : "Waiting in the lobby"}{" "}
                · {peopleCount(session.userIds.length)}
              </>
            }
          />
        ))}
      </div>

      {recentMatches.length > 0 && (
        <section className="mt-8">
          <h2 className="text-store-mist mb-2 text-xs tracking-widest">
            RECENT MATCHES
          </h2>
          <Shelf>
            {/* All mode sessions put one spine on the shelf per agreed title */}
            {recentMatches.map(match => (
              <div
                key={`${match.sessionId}:${match.movieId}`}
                className="relative shrink-0"
              >
                <TapeSpine
                  title={match.title}
                  href={`/sessions/${match.sessionId}/match`}
                />
                {match.mediaType === "tv" && (
                  <TvMark className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2" />
                )}
              </div>
            ))}
          </Shelf>
        </section>
      )}

      <Link
        href="/settings"
        className="text-store-mist mt-8 inline-block text-sm underline underline-offset-4"
      >
        Link your Trakt or Letterboxd watchlist
      </Link>
    </div>
  )
}

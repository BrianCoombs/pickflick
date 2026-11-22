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

export default async function SessionsPage() {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const [sessionsResult, matchesResult] = await Promise.all([
    getActiveSessions(),
    getRecentMatches()
  ])
  const activeSessions: { id: string; userIds: string[] }[] =
    sessionsResult.isSuccess ? sessionsResult.data : []
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
            subtitle={`${session.userIds.length} ${
              session.userIds.length === 1 ? "person" : "people"
            } · back to swiping`}
          />
        ))}
      </div>

      {recentMatches.length > 0 && (
        <section className="mt-8">
          <h2 className="text-store-mist mb-2 text-xs tracking-widest">
            RECENT MATCHES
          </h2>
          <Shelf>
            {recentMatches.map(match => (
              <TapeSpine
                key={match.sessionId}
                title={match.title}
                href={`/sessions/${match.sessionId}/match`}
              />
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

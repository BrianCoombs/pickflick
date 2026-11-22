import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { count, eq } from "drizzle-orm"
import { db } from "@/db/db"
import { matchHistory, movieSessions, swipes } from "@/db/schema"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { MovieService } from "@/lib/api/movie-service"
import { TMDbAPI } from "@/lib/api/tmdb"
import { formatRuntime } from "@/lib/store/format"
import { Button } from "@/components/ui/button"
import { Receipt, ReceiptLine, ReceiptRule } from "@/components/store/receipt"

interface MatchPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function MatchPage({ params }: MatchPageProps) {
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect("/login")
  }

  const { sessionId } = await params

  const [session] = await db
    .select()
    .from(movieSessions)
    .where(eq(movieSessions.id, sessionId))
    .limit(1)

  if (!session || !session.matchedMovieId) {
    notFound()
  }

  // Only people in the session see its receipt
  if (!session.userIds.includes(user.id)) {
    redirect("/sessions")
  }

  const [movie, [swipeCount], [match]] = await Promise.all([
    new MovieService().getEnrichedMovie(parseInt(session.matchedMovieId)),
    db
      .select({ value: count() })
      .from(swipes)
      .where(eq(swipes.sessionId, sessionId)),
    db
      .select({ matchedAt: matchHistory.matchedAt })
      .from(matchHistory)
      .where(eq(matchHistory.sessionId, sessionId))
      .limit(1)
  ])

  const posterUrl = TMDbAPI.getPosterUrl(movie.poster_path, "w500")
  const releaseYear = movie.release_date
    ? new Date(movie.release_date).getFullYear()
    : null
  const details = [movie.genres?.[0]?.name, formatRuntime(movie.runtime)]
    .filter(Boolean)
    .join(" · ")
  const date = (match?.matchedAt ?? session.createdAt).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-4">
      <h1 className="store-heading mb-6 text-3xl sm:text-4xl">
        Everyone
        <br />
        picked it
      </h1>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start">
        {posterUrl && (
          <div className="bg-store-tape mx-auto w-full max-w-[260px] rounded-[3px] p-2 md:max-w-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={posterUrl}
              alt={movie.title}
              className="aspect-[2/3] w-full object-cover"
            />
          </div>
        )}

        <div>
          <Receipt>
            <div className="font-display text-store-navy text-center text-sm">
              PICKFLICK VIDEO
            </div>
            <div className="text-center">
              Session {sessionId.slice(0, 8)} · {date}
            </div>
            <ReceiptRule />
            <div className="font-display text-store-red my-1 text-base leading-tight">
              {movie.title}
              {releaseYear && ` (${releaseYear})`}
            </div>
            <ReceiptLine
              label={details || "Movie"}
              value={`★ ${movie.vote_average.toFixed(1)}`}
            />
            <ReceiptRule />
            <ReceiptLine label="Renters" value={session.userIds.length} />
            <ReceiptLine label="Swipes" value={swipeCount?.value ?? 0} />
          </Receipt>

          <div className="mt-6 grid gap-3">
            {movie.trailerUrl && (
              <Button asChild size="lg">
                <a href={movie.trailerUrl} target="_blank" rel="noreferrer">
                  Watch trailer
                </a>
              </Button>
            )}
            <Button asChild variant="secondary" size="lg">
              <Link href="/sessions/new">Start a new session</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

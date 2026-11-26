import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { asc, count, eq } from "drizzle-orm"
import { db } from "@/db/db"
import { matchHistory, movieSessions, swipes } from "@/db/schema"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { getEnrichedTitle } from "@/lib/api/movie-service"
import { TMDbAPI } from "@/lib/api/tmdb"
import { mediaCopy } from "@/lib/titles/copy"
import { titleLengthLabel } from "@/lib/titles/format"
import { parseMediaType, type Title } from "@/lib/titles/title"
import { Button } from "@/components/ui/button"
import { Paper } from "@/components/store/paper"
import { Receipt, ReceiptLine, ReceiptRule } from "@/components/store/receipt"

interface MatchPageProps {
  params: Promise<{
    sessionId: string
  }>
}

const formatDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })

// Store name, session code and date, at the top of both receipts
function MatchReceiptHeader({
  sessionId,
  date
}: {
  sessionId: string
  date: Date
}) {
  return (
    <>
      <div className="font-display text-store-navy text-center text-sm">
        PICKFLICK VIDEO
      </div>
      <div className="text-center">
        Session {sessionId.slice(0, 8)} · {formatDate(date)}
      </div>
    </>
  )
}

function NewSessionButton() {
  return (
    <Button asChild variant="secondary" size="lg">
      <Link href="/sessions/new">Start a new session</Link>
    </Button>
  )
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

  if (!session) {
    notFound()
  }

  // Only people in the session see its receipt
  if (!session.userIds.includes(user.id)) {
    redirect("/sessions")
  }

  const mediaType = parseMediaType(session.mediaType)

  const [[swipeCount], matches] = await Promise.all([
    db
      .select({ value: count() })
      .from(swipes)
      .where(eq(swipes.sessionId, sessionId)),
    db
      .select({
        movieId: matchHistory.movieId,
        matchedAt: matchHistory.matchedAt
      })
      .from(matchHistory)
      .where(eq(matchHistory.sessionId, sessionId))
      .orderBy(asc(matchHistory.matchedAt))
  ])
  const swipeTotal = swipeCount?.value ?? 0
  const date = matches[0]?.matchedAt ?? session.createdAt

  // First mode: one title ended the session. If TMDb can't load it, the
  // receipt still prints with what we know.
  if (session.matchedMovieId) {
    const matchedId = session.matchedMovieId
    const title = await getEnrichedTitle(mediaType, parseInt(matchedId)).catch(
      error => {
        console.error("Failed to load the matched title:", error)
        return null
      }
    )
    return (
      <FirstMatch
        sessionId={sessionId}
        title={title}
        fallbackName={`Tape #${matchedId}`}
        kindLabel={mediaCopy(mediaType).kindLabel}
        date={date}
        renters={session.userIds.length}
        swipeTotal={swipeTotal}
      />
    )
  }

  // Still swiping: back to the session
  if (session.status !== "completed") {
    redirect(`/sessions/${sessionId}`)
  }

  // Completed without a single match: all mode (match_mode can't change once
  // completed). Every title everyone rented, possibly none. A title TMDb can't load is left
  // off rather than breaking the receipt.
  const loaded = await Promise.allSettled(
    matches.map(m => getEnrichedTitle(mediaType, Number(m.movieId)))
  )
  const titles = loaded
    .flatMap(r => (r.status === "fulfilled" ? [r.value] : []))
    .sort((a, b) => b.rating - a.rating)

  return (
    <AllMatches
      sessionId={sessionId}
      titles={titles}
      agreedCount={matches.length}
      date={date}
      renters={session.userIds.length}
      swipeTotal={swipeTotal}
      plural={mediaCopy(mediaType).plural}
    />
  )
}

function FirstMatch({
  sessionId,
  title,
  fallbackName,
  kindLabel,
  date,
  renters,
  swipeTotal
}: {
  sessionId: string
  title: Title | null // null when TMDb couldn't load it
  fallbackName: string
  kindLabel: string
  date: Date
  renters: number
  swipeTotal: number
}) {
  const posterUrl = title && TMDbAPI.getPosterUrl(title.posterPath, "w500")
  const details = title
    ? [title.genres[0]?.name, titleLengthLabel(title)]
        .filter(Boolean)
        .join(" · ")
    : ""

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
              alt={title.name}
              className="aspect-[2/3] w-full object-cover"
            />
          </div>
        )}

        <div>
          <Receipt>
            <MatchReceiptHeader sessionId={sessionId} date={date} />
            <ReceiptRule />
            <div className="font-display text-store-red-ink my-1 text-base leading-tight">
              {title ? title.name : fallbackName}
              {title?.year && ` (${title.year})`}
            </div>
            {title ? (
              <ReceiptLine
                label={details || kindLabel}
                value={`★ ${title.rating.toFixed(1)}`}
              />
            ) : (
              <div>
                {kindLabel} details didn&apos;t load. Refresh to try again.
              </div>
            )}
            <ReceiptRule />
            <ReceiptLine label="Renters" value={renters} />
            <ReceiptLine label="Swipes" value={swipeTotal} />
          </Receipt>

          <div className="mt-6 grid gap-3">
            {title?.trailerUrl && (
              <Button asChild size="lg">
                <a href={title.trailerUrl} target="_blank" rel="noreferrer">
                  Watch trailer
                </a>
              </Button>
            )}
            <NewSessionButton />
          </div>
        </div>
      </div>
    </div>
  )
}

function AllMatches({
  sessionId,
  titles,
  agreedCount,
  date,
  renters,
  swipeTotal,
  plural
}: {
  sessionId: string
  titles: Title[]
  agreedCount: number
  date: Date
  renters: number
  swipeTotal: number
  plural: string
}) {
  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-4">
      <h1 className="store-heading mb-6 text-3xl sm:text-4xl">
        {agreedCount > 0 ? (
          <>
            Everyone
            <br />
            picked these
          </>
        ) : (
          <>
            Nobody
            <br />
            agreed
          </>
        )}
      </h1>

      <Receipt>
        <MatchReceiptHeader sessionId={sessionId} date={date} />
        <ReceiptRule />
        {titles.map(title => (
          <ReceiptLine
            key={title.key}
            className="py-0.5"
            label={
              <span className="font-semibold">
                {title.name}
                {title.year && ` (${title.year})`}
              </span>
            }
            value={
              <span className="whitespace-nowrap">
                ★ {title.rating.toFixed(1)}
              </span>
            }
          />
        ))}
        {agreedCount === 0 && (
          <div className="py-0.5">No {plural} everyone rented.</div>
        )}
        {/* Some or all of the agreed titles didn't load from TMDb */}
        {titles.length < agreedCount && (
          <div className="py-0.5">
            {titles.length === 0
              ? `Couldn't load the ${plural} you agreed on. Refresh to try again.`
              : `${agreedCount - titles.length} more couldn't load. Refresh to try again.`}
          </div>
        )}
        <ReceiptRule />
        <ReceiptLine label="Agreed" value={agreedCount} />
        <ReceiptLine label="Renters" value={renters} />
        <ReceiptLine label="Swipes" value={swipeTotal} />
      </Receipt>

      {titles.length > 0 && (
        <ul className="mt-6 grid gap-3">
          {titles.map(title => {
            const posterUrl = TMDbAPI.getPosterUrl(title.posterPath, "w200")
            const meta = [title.year, titleLengthLabel(title)]
              .filter(Boolean)
              .join(" · ")
            return (
              <li key={title.key}>
                <Paper className="flex gap-3 p-2">
                  {posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={posterUrl}
                      alt=""
                      className="bg-store-tape aspect-[2/3] w-16 shrink-0 object-cover"
                    />
                  ) : (
                    <div className="bg-store-tape aspect-[2/3] w-16 shrink-0" />
                  )}
                  <div className="flex min-w-0 flex-1 flex-col text-sm">
                    <div className="font-display leading-tight">
                      {title.name}
                    </div>
                    {meta && (
                      <div className="text-xs text-neutral-600">{meta}</div>
                    )}
                    <div className="text-xs">★ {title.rating.toFixed(1)}</div>
                    {title.trailerUrl && (
                      <a
                        href={title.trailerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-store-red-ink mt-auto flex min-h-11 items-center text-xs font-semibold underline underline-offset-4"
                      >
                        Watch trailer
                      </a>
                    )}
                  </div>
                </Paper>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-6 grid gap-3">
        <NewSessionButton />
      </div>
    </div>
  )
}

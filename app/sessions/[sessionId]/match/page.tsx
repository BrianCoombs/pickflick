import { notFound, redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"
import { db } from "@/db/db"
import { movieSessions } from "@/db/schema"
import { eq } from "drizzle-orm"
import { MovieService } from "@/lib/api/movie-service"
import { TMDbAPI } from "@/lib/api/tmdb"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, ExternalLink, Play, Star, Users } from "lucide-react"
import Link from "next/link"

interface MatchPageProps {
  params: Promise<{
    sessionId: string
  }>
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  const { sessionId } = await params

  // Get session details
  const [session] = await db
    .select()
    .from(movieSessions)
    .where(eq(movieSessions.id, sessionId))
    .limit(1)

  if (!session || !session.matchedMovieId) {
    notFound()
  }

  // Get movie details
  const movieService = new MovieService()
  const movie = await movieService.getEnrichedMovie(
    parseInt(session.matchedMovieId)
  )

  const posterUrl = TMDbAPI.getPosterUrl(movie.poster_path, "w500")
  const backdropUrl = TMDbAPI.getBackdropUrl(movie.backdrop_path)
  const releaseYear = new Date(movie.release_date).getFullYear()
  const runtime = `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m`

  return (
    <div className="min-h-screen">
      {/* Backdrop */}
      {backdropUrl && (
        <div className="absolute inset-0 h-[50vh]">
          <img
            src={backdropUrl}
            alt={movie.title}
            className="size-full object-cover"
          />
          <div className="via-background/50 to-background absolute inset-0 bg-gradient-to-b from-transparent" />
        </div>
      )}

      <div className="container relative mx-auto px-4 py-8">
        {/* Success message */}
        <div className="mb-8 pt-8 text-center">
          <h1 className="mb-2 text-4xl font-bold">It's a Match! 🎉</h1>
          <p className="text-muted-foreground text-xl">
            Everyone wants to watch this movie
          </p>
        </div>

        {/* Movie details */}
        <div className="mx-auto max-w-6xl">
          <Card className="overflow-hidden">
            <div className="md:flex">
              {/* Poster */}
              <div className="md:w-1/3">
                {posterUrl ? (
                  <img
                    src={posterUrl}
                    alt={movie.title}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="bg-muted flex h-96 w-full items-center justify-center">
                    <p className="text-muted-foreground">No poster available</p>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-6 md:w-2/3 md:p-8">
                <CardHeader className="p-0">
                  <CardTitle className="mb-4 text-3xl">{movie.title}</CardTitle>
                  <div className="mb-4 flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      <Calendar className="mr-1 size-3" />
                      {releaseYear}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="mr-1 size-3" />
                      {runtime}
                    </Badge>
                    <Badge variant="secondary">
                      <Star className="mr-1 size-3" />
                      {movie.vote_average.toFixed(1)}/10
                    </Badge>
                    <Badge variant="secondary">
                      <Users className="mr-1 size-3" />
                      {session.userIds.length} watching
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 p-0">
                  {/* Genres */}
                  {movie.genres && movie.genres.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {movie.genres.map(genre => (
                        <Badge key={genre.id} variant="outline">
                          {genre.name}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Overview */}
                  <div>
                    <h3 className="mb-2 font-semibold">Overview</h3>
                    <p className="text-muted-foreground">{movie.overview}</p>
                  </div>

                  {/* Ratings */}
                  {movie.enrichedRatings && (
                    <div>
                      <h3 className="mb-2 font-semibold">Ratings</h3>
                      <div className="flex flex-wrap gap-4">
                        <div>
                          <span className="text-muted-foreground text-sm">
                            TMDb:{" "}
                          </span>
                          <span className="font-medium">
                            {movie.enrichedRatings.tmdb}
                          </span>
                        </div>
                        {movie.enrichedRatings.imdb && (
                          <div>
                            <span className="text-muted-foreground text-sm">
                              IMDb:{" "}
                            </span>
                            <span className="font-medium">
                              {movie.enrichedRatings.imdb}
                            </span>
                          </div>
                        )}
                        {movie.enrichedRatings.rottenTomatoes && (
                          <div>
                            <span className="text-muted-foreground text-sm">
                              Rotten Tomatoes:{" "}
                            </span>
                            <span className="font-medium">
                              {movie.enrichedRatings.rottenTomatoes}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4">
                    {movie.trailerUrl && (
                      <a
                        href={movie.trailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button>
                          <Play className="mr-2 size-4" />
                          Watch Trailer
                        </Button>
                      </a>
                    )}

                    <Link href="/sessions/new">
                      <Button variant="outline">Start New Session</Button>
                    </Link>

                    <a
                      href={`https://www.themoviedb.org/movie/${movie.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="ghost">
                        <ExternalLink className="mr-2 size-4" />
                        More Info
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

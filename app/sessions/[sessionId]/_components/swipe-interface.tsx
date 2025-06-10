"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  X,
  Heart,
  Star,
  Users,
  Calendar,
  Clock,
  Trash2,
  Copy,
  Share2,
  Play
} from "lucide-react"
import {
  swipeMovie,
  deleteMovieSession,
  startMovieSession
} from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { TMDbAPI } from "@/lib/api/tmdb"
import type { Movie } from "@/lib/api/tmdb"
import { CriteriaDialog } from "./criteria-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog"

interface SwipeInterfaceProps {
  sessionId: string
  movies: Movie[]
  participantCount: number
  sessionStarted: boolean
  isHost: boolean
  preferences?: any
}

export default function SwipeInterface({
  sessionId,
  movies,
  participantCount,
  sessionStarted,
  isHost,
  preferences
}: SwipeInterfaceProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [deletingSession, setDeletingSession] = useState(false)

  const currentMovie = movies[currentIndex]
  const hasMoreMovies = currentIndex < movies.length - 1

  const handleSwipe = async (swipeDirection: "left" | "right" | "super") => {
    if (loading || !currentMovie) return

    setLoading(true)
    setDirection(swipeDirection)

    try {
      const result = await swipeMovie(
        sessionId,
        currentMovie.id.toString(),
        swipeDirection
      )

      if (result.isSuccess && result.data?.matched) {
        toast({
          title: "It's a match! 🎬",
          description: "Everyone wants to watch this movie!"
        })

        // Redirect to match page
        setTimeout(() => {
          router.push(`/sessions/${sessionId}/match`)
        }, 1000)
      } else if (result.isSuccess) {
        // Move to next movie
        if (hasMoreMovies) {
          setTimeout(() => {
            setCurrentIndex(prev => prev + 1)
            setDirection(null)
          }, 300)
        } else {
          toast({
            title: "No more movies",
            description: "You've gone through all available movies!"
          })
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record swipe. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: KeyboardEvent) => {
    if (loading || !sessionStarted) return

    switch (e.key) {
      case "ArrowLeft":
        handleSwipe("left")
        break
      case "ArrowRight":
        handleSwipe("right")
        break
      case "ArrowUp":
        handleSwipe("super")
        break
    }
  }

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress)
    return () => window.removeEventListener("keydown", handleKeyPress)
  }, [currentIndex, loading, sessionStarted])

  const handleStartSession = async () => {
    try {
      const result = await startMovieSession(sessionId)
      if (result.isSuccess) {
        toast({
          title: "Session started!",
          description: "Let's start swiping together"
        })
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive"
      })
    }
  }

  const handleDeleteSession = async () => {
    setDeletingSession(true)
    try {
      const result = await deleteMovieSession(sessionId)
      if (result.isSuccess) {
        toast({
          title: "Session deleted",
          description: "The session has been deleted successfully"
        })
        router.push("/sessions")
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive"
      })
    } finally {
      setDeletingSession(false)
    }
  }

  const copySessionCode = async () => {
    const shortCode = sessionId.slice(0, 8).toLowerCase()
    try {
      await navigator.clipboard.writeText(shortCode)
      toast({
        title: "Copied!",
        description: "Session code copied to clipboard"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy session code",
        variant: "destructive"
      })
    }
  }

  const shareSession = async () => {
    const shortCode = sessionId.slice(0, 8).toLowerCase()
    const shareData = {
      title: "Join my PickFlick session!",
      text: `Join my movie swiping session with code: ${shortCode}`,
      url: `${window.location.origin}/sessions/join`
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback to copy
        await copySessionCode()
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast({
          title: "Error",
          description: "Failed to share session",
          variant: "destructive"
        })
      }
    }
  }

  // Show waiting screen if session hasn't started
  if (!sessionStarted) {
    const shortCode = sessionId.slice(0, 8).toLowerCase()

    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="max-w-md space-y-8 text-center">
          <div className="space-y-4">
            <div className="bg-muted/30 mx-auto flex size-20 items-center justify-center rounded-full">
              <Users className="text-muted-foreground size-10" />
            </div>
            <h2 className="text-3xl font-bold">
              {isHost
                ? "Your session is ready!"
                : "Waiting for host to start..."}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isHost
                ? "Share the session code with your friends"
                : "The host will start the session when everyone is ready"}
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-6">
              <p className="text-muted-foreground mb-2 text-sm">Session Code</p>
              <div className="flex items-center justify-center gap-3">
                <code className="font-mono text-4xl font-bold tracking-wider">
                  {shortCode}
                </code>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copySessionCode}
                    className="size-10"
                  >
                    <Copy className="size-4" />
                  </Button>
                  {typeof navigator !== "undefined" && "share" in navigator && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={shareSession}
                      className="size-10"
                    >
                      <Share2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary" className="text-base">
                <Users className="mr-2 size-4" />
                {participantCount}{" "}
                {participantCount === 1 ? "participant" : "participants"}{" "}
                waiting
              </Badge>
            </div>

            {isHost && participantCount >= 1 && (
              <Button
                size="lg"
                onClick={handleStartSession}
                className="font-semibold"
              >
                <Play className="mr-2 size-5" />
                Start Session
              </Button>
            )}

            <p className="text-muted-foreground text-sm">
              Friends can join at{" "}
              <span className="font-medium">
                {typeof window !== "undefined"
                  ? `${window.location.origin}/sessions/join`
                  : "/sessions/join"}
              </span>
            </p>
          </div>

          {isHost && (
            <div className="pt-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="mr-2 size-4" />
                    Cancel Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete the session. You can always create a new
                      one.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Waiting</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSession}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Session
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (!currentMovie) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-semibold">No more movies!</h2>
          <p className="text-muted-foreground mb-6">
            {movies.length === 0
              ? "No movies found matching your criteria."
              : "You've swiped through all available movies."}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <CriteriaDialog
            sessionId={sessionId}
            currentPreferences={preferences}
          />

          {isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 size-4" />
                  Delete Session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the session and all swipe data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSession}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    )
  }

  const posterUrl = TMDbAPI.getPosterUrl(currentMovie.poster_path)
  const releaseYear = new Date(currentMovie.release_date).getFullYear()

  return (
    <div className="relative flex h-full flex-col items-center justify-center p-4">
      {/* Status bar */}
      <div className="absolute inset-x-4 top-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="flex items-center gap-2">
            <Users className="size-3" />
            {participantCount} swiping
          </Badge>
          <Badge
            variant="outline"
            className="cursor-pointer font-mono"
            onClick={copySessionCode}
          >
            {sessionId.slice(0, 8).toLowerCase()}
          </Badge>
          <p className="text-muted-foreground text-sm">
            {currentIndex + 1} / {movies.length}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <CriteriaDialog
            sessionId={sessionId}
            currentPreferences={preferences}
          />

          {isHost && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <Trash2 className="size-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this session?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the session and all swipe data.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteSession}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={deletingSession}
                  >
                    {deletingSession ? "Deleting..." : "Delete"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Movie card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentMovie.id}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{
            scale: 1,
            opacity: 1,
            x: direction === "left" ? -300 : direction === "right" ? 300 : 0,
            rotate: direction === "left" ? -20 : direction === "right" ? 20 : 0
          }}
          exit={{
            scale: 0.8,
            opacity: 0,
            x: direction === "left" ? -300 : direction === "right" ? 300 : 0,
            rotate: direction === "left" ? -20 : direction === "right" ? 20 : 0
          }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md"
        >
          <Card className="overflow-hidden">
            <div className="bg-muted relative aspect-[2/3]">
              {posterUrl ? (
                <img
                  src={posterUrl}
                  alt={currentMovie.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <p className="text-muted-foreground">No poster available</p>
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

              {/* Movie info overlay */}
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <h2 className="mb-2 text-2xl font-bold">
                  {currentMovie.title}
                </h2>
                <div className="mb-3 flex items-center gap-4">
                  <Badge
                    variant="secondary"
                    className="border-0 bg-white/20 text-white"
                  >
                    <Calendar className="mr-1 size-3" />
                    {releaseYear}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="border-0 bg-white/20 text-white"
                  >
                    <Star className="mr-1 size-3" />
                    {currentMovie.vote_average.toFixed(1)}
                  </Badge>
                </div>
                <p className="line-clamp-3 text-sm opacity-90">
                  {currentMovie.overview}
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Swipe buttons */}
      <div className="absolute bottom-8 flex gap-4">
        <Button
          variant="outline"
          size="icon"
          className="size-16 rounded-full border-2"
          onClick={() => handleSwipe("left")}
          disabled={loading || !sessionStarted}
        >
          <X className="size-8" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-20 rounded-full border-2 border-yellow-500 hover:bg-yellow-50"
          onClick={() => handleSwipe("super")}
          disabled={loading || !sessionStarted}
        >
          <Star className="size-10 text-yellow-500" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-16 rounded-full border-2 border-green-500 hover:bg-green-50"
          onClick={() => handleSwipe("right")}
          disabled={loading || !sessionStarted}
        >
          <Heart className="size-8 text-green-500" />
        </Button>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 text-center">
        <p className="text-muted-foreground text-xs">
          Use arrow keys: ← Pass | → Like | ↑ Super Like
        </p>
      </div>
    </div>
  )
}

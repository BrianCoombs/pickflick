"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Heart, Star, Users, Calendar, Clock, Trash2 } from "lucide-react"
import { swipeMovie, deleteMovieSession } from "@/actions/db/movies-actions"
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
  isHost: boolean
  preferences?: any
}

export default function SwipeInterface({
  sessionId,
  movies,
  participantCount,
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
    if (loading) return

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
  }, [currentIndex, loading])

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
          disabled={loading}
        >
          <X className="size-8" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-20 rounded-full border-2 border-yellow-500 hover:bg-yellow-50"
          onClick={() => handleSwipe("super")}
          disabled={loading}
        >
          <Star className="size-10 text-yellow-500" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="size-16 rounded-full border-2 border-green-500 hover:bg-green-50"
          onClick={() => handleSwipe("right")}
          disabled={loading}
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

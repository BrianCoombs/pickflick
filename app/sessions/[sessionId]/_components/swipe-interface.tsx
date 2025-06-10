"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { X, Heart, Star, Users, Calendar, Clock } from "lucide-react"
import { swipeMovie } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import { TMDbAPI } from "@/lib/api/tmdb"
import type { Movie } from "@/lib/api/tmdb"

interface SwipeInterfaceProps {
  sessionId: string
  movies: Movie[]
  participantCount: number
}

export default function SwipeInterface({
  sessionId,
  movies,
  participantCount
}: SwipeInterfaceProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

      if (result.success && result.data?.matched) {
        toast({
          title: "It's a match! 🎬",
          description: "Everyone wants to watch this movie!"
        })

        // Redirect to match page
        setTimeout(() => {
          router.push(`/sessions/${sessionId}/match`)
        }, 1000)
      } else if (result.success) {
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

  if (!currentMovie) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">No movies available</p>
      </div>
    )
  }

  const posterUrl = TMDbAPI.getPosterUrl(currentMovie.poster_path)
  const releaseYear = new Date(currentMovie.release_date).getFullYear()

  return (
    <div className="relative flex h-full flex-col items-center justify-center p-4">
      {/* Status bar */}
      <div className="absolute inset-x-4 top-4 flex items-center justify-between">
        <Badge variant="secondary" className="flex items-center gap-2">
          <Users className="size-3" />
          {participantCount} swiping
        </Badge>
        <p className="text-muted-foreground text-sm">
          {currentIndex + 1} / {movies.length}
        </p>
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

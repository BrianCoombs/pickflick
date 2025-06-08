"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { createMovieSession } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { Film, Users } from "lucide-react"

const movieGenres = [
  { id: 28, name: "Action" },
  { id: 12, name: "Adventure" },
  { id: 16, name: "Animation" },
  { id: 35, name: "Comedy" },
  { id: 80, name: "Crime" },
  { id: 99, name: "Documentary" },
  { id: 18, name: "Drama" },
  { id: 10751, name: "Family" },
  { id: 14, name: "Fantasy" },
  { id: 36, name: "History" },
  { id: 27, name: "Horror" },
  { id: 10402, name: "Music" },
  { id: 9648, name: "Mystery" },
  { id: 10749, name: "Romance" },
  { id: 878, name: "Science Fiction" },
  { id: 10770, name: "TV Movie" },
  { id: 53, name: "Thriller" },
  { id: 10752, name: "War" },
  { id: 37, name: "Western" },
]

export default function NewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [selectedGenres, setSelectedGenres] = useState<number[]>([])
  const [yearRange, setYearRange] = useState({
    min: 1990,
    max: new Date().getFullYear()
  })

  const handleCreateSession = async () => {
    setLoading(true)
    
    try {
      const preferences = {
        genres: selectedGenres,
        minYear: yearRange.min,
        maxYear: yearRange.max,
        minRating: 6
      }

      const result = await createMovieSession([], preferences)
      
      if (result.success && result.data) {
        toast({
          title: "Session created!",
          description: "Share the session code with your friends"
        })
        router.push(`/sessions/${result.data.id}`)
      } else {
        throw new Error(result.message || "Failed to create session")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev => 
      prev.includes(genreId) 
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Session</h1>
        <p className="text-muted-foreground">Set your preferences and start swiping</p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="h-5 w-5" />
              Movie Preferences
            </CardTitle>
            <CardDescription>
              Choose your preferred genres and filters
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base mb-3 block">Genres</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {movieGenres.map(genre => (
                  <div key={genre.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`genre-${genre.id}`}
                      checked={selectedGenres.includes(genre.id)}
                      onCheckedChange={() => toggleGenre(genre.id)}
                    />
                    <Label
                      htmlFor={`genre-${genre.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {genre.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="min-year">From Year</Label>
                <Input
                  id="min-year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={yearRange.min}
                  onChange={(e) => setYearRange(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="max-year">To Year</Label>
                <Input
                  id="max-year"
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={yearRange.max}
                  onChange={(e) => setYearRange(prev => ({ ...prev, max: parseInt(e.target.value) }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Invite Friends
            </CardTitle>
            <CardDescription>
              You can share the session code after creating it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Create the session first, then share the code with your friends so they can join and start swiping together.
            </p>
          </CardContent>
        </Card>

        <Button
          onClick={handleCreateSession}
          disabled={loading}
          size="lg"
          className="w-full"
        >
          {loading ? "Creating..." : "Create Session"}
        </Button>
      </div>
    </div>
  )
}
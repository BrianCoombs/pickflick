"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { updateSessionPreferences } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { Settings2 } from "lucide-react"

interface CriteriaDialogProps {
  sessionId: string
  currentPreferences?: any
}

// TMDb genre IDs
const GENRES = [
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
  { id: 37, name: "Western" }
]

export function CriteriaDialog({
  sessionId,
  currentPreferences
}: CriteriaDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [genre, setGenre] = useState(
    currentPreferences?.genres?.[0]?.toString() || ""
  )
  const [yearRange, setYearRange] = useState(
    currentPreferences?.minYear && currentPreferences?.maxYear
      ? `${currentPreferences.minYear}-${currentPreferences.maxYear}`
      : ""
  )

  const handleSubmit = async () => {
    setLoading(true)

    const preferences: any = {}

    if (genre) {
      preferences.genres = [parseInt(genre)]
    }

    if (yearRange) {
      const [minYear, maxYear] = yearRange.split("-").map(y => parseInt(y))
      preferences.minYear = minYear
      preferences.maxYear = maxYear
    }

    try {
      const result = await updateSessionPreferences(sessionId, preferences)

      if (result.isSuccess) {
        toast({
          title: "Criteria updated",
          description: "New movies will be loaded based on your preferences"
        })
        setOpen(false)
        // Reload the page to fetch new movies
        window.location.reload()
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
        description: "Failed to update criteria",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="mr-2 size-4" />
          Change Criteria
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Movie Criteria</DialogTitle>
          <DialogDescription>
            Change your movie preferences. This will clear current swipes and
            load new movies.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="genre" className="text-right">
              Genre
            </Label>
            <Select value={genre} onValueChange={setGenre}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All genres</SelectItem>
                {GENRES.map(g => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="year-range" className="text-right">
              Years
            </Label>
            <Select value={yearRange} onValueChange={setYearRange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select year range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All years</SelectItem>
                <SelectItem value="2020-2025">2020 - 2025</SelectItem>
                <SelectItem value="2015-2019">2015 - 2019</SelectItem>
                <SelectItem value="2010-2014">2010 - 2014</SelectItem>
                <SelectItem value="2005-2009">2005 - 2009</SelectItem>
                <SelectItem value="2000-2004">2000 - 2004</SelectItem>
                <SelectItem value="1990-1999">1990s</SelectItem>
                <SelectItem value="1980-1989">1980s</SelectItem>
                <SelectItem value="1970-1979">1970s</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Updating..." : "Update Criteria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

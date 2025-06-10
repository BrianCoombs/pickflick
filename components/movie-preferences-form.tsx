"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  MOVIE_GENRES,
  YEAR_RANGES,
  DEFAULT_MIN_YEAR,
  DEFAULT_MAX_YEAR
} from "@/lib/constants/movies"

interface MoviePreferences {
  genres?: number[]
  minYear?: number
  maxYear?: number
  minRating?: number
}

interface MoviePreferencesFormProps {
  mode?: "create" | "update"
  initialPreferences?: MoviePreferences
  onSubmit: (preferences: MoviePreferences) => void | Promise<void>
  submitLabel?: string
  loading?: boolean
}

export function MoviePreferencesForm({
  mode = "create",
  initialPreferences,
  onSubmit,
  submitLabel,
  loading = false
}: MoviePreferencesFormProps) {
  const [selectedGenres, setSelectedGenres] = useState<number[]>(
    initialPreferences?.genres || []
  )
  const [yearRange, setYearRange] = useState({
    min: initialPreferences?.minYear || DEFAULT_MIN_YEAR,
    max: initialPreferences?.maxYear || DEFAULT_MAX_YEAR
  })
  const [useAllYears, setUseAllYears] = useState(
    !initialPreferences?.minYear && !initialPreferences?.maxYear
  )
  const [yearRangePreset, setYearRangePreset] = useState("")

  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    )
  }

  const handleSelectAllGenres = () => {
    setSelectedGenres([])
  }

  const handleYearRangePresetChange = (value: string) => {
    setYearRangePreset(value)

    if (value === "all") {
      setUseAllYears(true)
      setYearRange({ min: DEFAULT_MIN_YEAR, max: DEFAULT_MAX_YEAR })
    } else {
      setUseAllYears(false)
      const preset = YEAR_RANGES.find(r => r.label === value)
      if (preset?.value) {
        setYearRange(preset.value)
      }
    }
  }

  const handleSubmit = () => {
    const preferences: MoviePreferences = {}

    // Only add genres if some are selected
    if (selectedGenres.length > 0) {
      preferences.genres = selectedGenres
    }

    // Only add year range if not using all years
    if (!useAllYears) {
      preferences.minYear = yearRange.min
      preferences.maxYear = yearRange.max
    }

    // Always include minimum rating
    preferences.minRating = 6

    onSubmit(preferences)
  }

  const defaultSubmitLabel =
    mode === "create" ? "Create Session" : "Update Criteria"

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label className="text-base">Genres</Label>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={handleSelectAllGenres}
            className="h-auto p-0 text-sm"
          >
            {selectedGenres.length === 0 ? "Select some" : "Clear all"}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {MOVIE_GENRES.map(genre => (
            <div key={genre.id} className="flex items-center space-x-2">
              <Checkbox
                id={`genre-${genre.id}`}
                checked={selectedGenres.includes(genre.id)}
                onCheckedChange={() => toggleGenre(genre.id)}
              />
              <Label
                htmlFor={`genre-${genre.id}`}
                className="cursor-pointer text-sm font-normal"
              >
                {genre.name}
              </Label>
            </div>
          ))}
        </div>
        {selectedGenres.length === 0 && (
          <p className="text-muted-foreground mt-2 text-xs">
            No genres selected - will show movies from all genres
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Label className="text-base">Year Range</Label>

        {/* Year range preset selector */}
        <Select
          value={yearRangePreset}
          onValueChange={handleYearRangePresetChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose a preset or set custom range" />
          </SelectTrigger>
          <SelectContent>
            {YEAR_RANGES.map(range => (
              <SelectItem
                key={range.label}
                value={range.value ? range.label : "all"}
              >
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom year inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min-year" className="text-sm">
              From Year
            </Label>
            <Input
              id="min-year"
              type="number"
              min="1900"
              max={DEFAULT_MAX_YEAR}
              value={yearRange.min}
              disabled={useAllYears}
              onChange={e => {
                setYearRangePreset("")
                setUseAllYears(false)
                setYearRange(prev => ({
                  ...prev,
                  min: parseInt(e.target.value) || DEFAULT_MIN_YEAR
                }))
              }}
            />
          </div>
          <div>
            <Label htmlFor="max-year" className="text-sm">
              To Year
            </Label>
            <Input
              id="max-year"
              type="number"
              min="1900"
              max={DEFAULT_MAX_YEAR}
              value={yearRange.max}
              disabled={useAllYears}
              onChange={e => {
                setYearRangePreset("")
                setUseAllYears(false)
                setYearRange(prev => ({
                  ...prev,
                  max: parseInt(e.target.value) || DEFAULT_MAX_YEAR
                }))
              }}
            />
          </div>
        </div>
        {useAllYears && (
          <p className="text-muted-foreground text-xs">
            Showing movies from all years
          </p>
        )}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={loading}
        size="lg"
        className="w-full"
      >
        {loading ? "Loading..." : submitLabel || defaultSubmitLabel}
      </Button>
    </div>
  )
}

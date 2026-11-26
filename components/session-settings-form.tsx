"use client"

import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"
import { useEffect, useId, useState } from "react"
import {
  getSessionWatchlistOptions,
  type WatchlistOption
} from "@/actions/db/watchlist-actions"
import { ToggleChip } from "@/components/store/toggle-chip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { WatchlistPicker } from "@/components/watchlist-picker"
import { RATING_STEPS, YEAR_RANGES } from "@/lib/constants/movies"
import { providerLogoUrl, STREAMING_PROVIDERS } from "@/lib/constants/providers"
import type { MatchMode } from "@/lib/sessions/progress"
import {
  initialFormState,
  initialSourceKeys,
  sourceKey,
  switchMediaType,
  toggleIn,
  toSettings,
  yearPresetLabel,
  type SessionSettings,
  type SettingsFormState
} from "@/lib/sessions/settings-form"
import { mediaCopy } from "@/lib/titles/copy"
import { genresFor } from "@/lib/titles/genres"
import type { MediaType } from "@/lib/titles/title"
import { cn } from "@/lib/utils"

interface SessionSettingsFormProps {
  initial: SessionSettings
  sessionId?: string // loads the members' watchlists (the dialog)
  submitLabel: string
  submitting: boolean
  onSubmit: (settings: SessionSettings) => void
}

const MEDIA_TYPES: readonly MediaType[] = ["movie", "tv"]

function SectionTitle({
  id,
  children
}: {
  id: string
  children: React.ReactNode
}) {
  return (
    <h3 id={id} className="font-display text-store-navy text-sm uppercase">
      {children}
    </h3>
  )
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-neutral-600">{children}</p>
}

// The host's session settings, shared by the new-session page and the
// Session settings dialog. Both containers pad by p-5 sm:p-6 with no bottom
// padding, so the sticky submit bar can run edge to edge.
export function SessionSettingsForm({
  initial,
  sessionId,
  submitLabel,
  submitting,
  onSubmit
}: SessionSettingsFormProps) {
  const ids = useId()
  const [state, setState] = useState<SettingsFormState>(() =>
    initialFormState(initial)
  )
  // null while loading; only the dialog (with a session) offers watchlists
  const [options, setOptions] = useState<WatchlistOption[] | null>(null)

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    getSessionWatchlistOptions(sessionId)
      .then(result => (result.isSuccess ? result.data : []))
      .catch(error => {
        console.error("Failed to load watchlist options:", error)
        return [] as WatchlistOption[]
      })
      .then(loaded => {
        if (cancelled) return
        const available = loaded.flatMap(person =>
          person.sources.map(s => sourceKey(person.userId, s.sourceType))
        )
        setOptions(loaded)
        setState(prev => ({
          ...prev,
          sources: initialSourceKeys(prev.sources, available)
        }))
      })
    return () => {
      cancelled = true
    }
  }, [sessionId])

  const update = (patch: Partial<SettingsFormState>) =>
    setState(prev => ({ ...prev, ...patch }))

  const copy = mediaCopy(state.mediaType)
  const settings = toSettings(state)
  const watchlistMode = Boolean(sessionId) && state.poolMode === "watchlists"
  const noSources =
    settings.preferences.mode === "watchlists" &&
    settings.preferences.sources.length === 0
  const canSubmit =
    !submitting && (!watchlistMode || (options !== null && !noSources))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    onSubmit(
      watchlistMode
        ? settings
        : toSettings({ ...state, poolMode: "filters" as const })
    )
  }

  const yearPreset = yearPresetLabel(state.minYear, state.maxYear)
  const handleYearPreset = (label: string) => {
    const preset = YEAR_RANGES.find(range => range.label === label)
    if (!preset) return
    update({
      minYear: preset.value ? String(preset.value.min) : "",
      maxYear: preset.value ? String(preset.value.max) : ""
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <section aria-labelledby={`${ids}-media`} className="space-y-2">
        <SectionTitle id={`${ids}-media`}>What are we watching?</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          {MEDIA_TYPES.map(mediaType => (
            <ToggleChip
              key={mediaType}
              pressed={state.mediaType === mediaType}
              onPressedChange={() =>
                setState(prev => switchMediaType(prev, mediaType))
              }
            >
              {mediaCopy(mediaType).toggle}
            </ToggleChip>
          ))}
        </div>
      </section>

      <section aria-labelledby={`${ids}-ending`} className="space-y-2">
        <SectionTitle id={`${ids}-ending`}>When do we stop?</SectionTitle>
        <RadioGroupPrimitive.Root
          value={state.matchMode}
          onValueChange={value => update({ matchMode: value as MatchMode })}
          aria-labelledby={`${ids}-ending`}
          className="grid gap-2"
        >
          {(
            [
              {
                value: "first",
                title: "First tape everyone rents",
                detail: `The first ${copy.singular} everyone swipes right on wins.`
              },
              {
                value: "all",
                title: "Swipe them all, then see every match",
                detail: `Everyone swipes every ${copy.singular}, then you get the whole list.`
              }
            ] as const
          ).map(option => (
            <RadioGroupPrimitive.Item
              key={option.value}
              value={option.value}
              className="border-store-navy text-store-navy data-[state=checked]:bg-store-navy data-[state=checked]:text-store-yellow focus-visible:ring-store-red-ink min-h-11 border-2 px-3 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <span className="block text-sm font-semibold">
                {option.title}
              </span>
              <span className="block text-xs opacity-80">{option.detail}</span>
            </RadioGroupPrimitive.Item>
          ))}
        </RadioGroupPrimitive.Root>
      </section>

      {sessionId && (
        <section aria-labelledby={`${ids}-from`} className="space-y-2">
          <SectionTitle id={`${ids}-from`}>Pick from</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {(["filters", "watchlists"] as const).map(mode => (
              <ToggleChip
                key={mode}
                pressed={state.poolMode === mode}
                onPressedChange={() => update({ poolMode: mode })}
              >
                {mode === "filters" ? "Filters" : "Watchlists"}
              </ToggleChip>
            ))}
          </div>
        </section>
      )}

      {watchlistMode ? (
        options === null ? (
          <p className="py-6 text-center text-sm text-neutral-600">
            Loading watchlists...
          </p>
        ) : (
          <WatchlistPicker
            options={options}
            selected={new Set(state.sources)}
            onToggle={key => update({ sources: toggleIn(state.sources, key) })}
            mediaType={state.mediaType}
          />
        )
      ) : (
        <>
          <section aria-labelledby={`${ids}-genres`} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <SectionTitle id={`${ids}-genres`}>Genres</SectionTitle>
              <button
                type="button"
                onClick={() => update({ genres: [] })}
                aria-pressed={state.genres.length === 0}
                className={cn(
                  "min-h-11 px-1 text-sm underline underline-offset-4",
                  state.genres.length === 0
                    ? "text-store-navy font-semibold no-underline"
                    : "text-store-red-ink"
                )}
              >
                Any genre
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {genresFor(state.mediaType).map(genre => (
                <ToggleChip
                  key={genre.id}
                  pressed={state.genres.includes(genre.id)}
                  onPressedChange={() =>
                    update({ genres: toggleIn(state.genres, genre.id) })
                  }
                >
                  {genre.name}
                </ToggleChip>
              ))}
            </div>
            <Hint>Pick a few. We&apos;ll mix them evenly.</Hint>
          </section>

          <section aria-labelledby={`${ids}-where`} className="space-y-2">
            <SectionTitle id={`${ids}-where`}>Where to watch</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {STREAMING_PROVIDERS.map(provider => (
                <ToggleChip
                  key={provider.key}
                  pressed={state.providers.includes(provider.key)}
                  onPressedChange={() =>
                    update({
                      providers: toggleIn(state.providers, provider.key)
                    })
                  }
                  className="pl-2"
                >
                  <img
                    src={providerLogoUrl(provider)}
                    alt=""
                    width={20}
                    height={20}
                    loading="lazy"
                    className="size-5 shrink-0 rounded-sm"
                  />
                  {provider.name}
                </ToggleChip>
              ))}
            </div>
            <Hint>Subscription streaming in the US. Rent/buy not counted.</Hint>
          </section>

          <section aria-labelledby={`${ids}-rating`} className="space-y-2">
            <SectionTitle id={`${ids}-rating`}>Rating</SectionTitle>
            <div className="grid grid-cols-4 gap-2">
              {RATING_STEPS.map(step => (
                <ToggleChip
                  key={step}
                  pressed={state.minRating === step}
                  onPressedChange={() => update({ minRating: step })}
                  className="w-full px-1"
                >
                  {step === 0 ? "Any" : `${step}+`}
                </ToggleChip>
              ))}
            </div>
            <Hint>Lowest TMDb score to include.</Hint>
          </section>

          <section aria-labelledby={`${ids}-years`} className="space-y-3">
            <SectionTitle id={`${ids}-years`}>{copy.yearLabel}</SectionTitle>
            <Select value={yearPreset} onValueChange={handleYearPreset}>
              <SelectTrigger aria-label="Year range preset">
                <SelectValue placeholder="Custom range" />
              </SelectTrigger>
              <SelectContent>
                {YEAR_RANGES.map(range => (
                  <SelectItem key={range.label} value={range.label}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`${ids}-min-year`} className="text-sm">
                  From
                </Label>
                <Input
                  id={`${ids}-min-year`}
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  placeholder="Any"
                  value={state.minYear}
                  onChange={e => update({ minYear: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${ids}-max-year`} className="text-sm">
                  To
                </Label>
                <Input
                  id={`${ids}-max-year`}
                  type="number"
                  inputMode="numeric"
                  min={1900}
                  placeholder="Any"
                  value={state.maxYear}
                  onChange={e => update({ maxYear: e.target.value })}
                />
              </div>
            </div>
          </section>
        </>
      )}

      <div className="bg-store-paper border-store-navy sticky bottom-0 z-10 -mx-5 border-t-2 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 sm:-mx-6 sm:px-6 sm:pb-6">
        {watchlistMode && options !== null && noSources && (
          <p className="mb-2 text-xs text-neutral-600">
            Tick at least one watchlist.
          </p>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={!canSubmit}
        >
          {submitting
            ? watchlistMode
              ? "Loading watchlists..."
              : `Finding ${copy.plural}...`
            : submitLabel}
        </Button>
      </div>
    </form>
  )
}

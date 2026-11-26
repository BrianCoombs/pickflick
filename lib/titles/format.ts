import { formatRuntime } from "../store/format"
import type { Title } from "./title"

function positiveCount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

// "5 seasons · 62 episodes", "1 season · 1 episode", "10 episodes", or null
export function formatSeasonsEpisodes(
  seasons: number | null | undefined,
  episodes: number | null | undefined
): string | null {
  const parts = [
    [positiveCount(seasons), "season"],
    [positiveCount(episodes), "episode"]
  ] as const
  const labels = parts
    .filter(([count]) => count !== null)
    .map(([count, word]) => plural(count as number, word))
  return labels.length ? labels.join(" · ") : null
}

// The card's length line: runtime for movies, seasons/episodes for TV
// (TV never shows a runtime)
export function titleLengthLabel(
  t: Pick<Title, "mediaType" | "runtimeMinutes" | "seasons" | "episodes">
): string | null {
  return t.mediaType === "tv"
    ? formatSeasonsEpisodes(t.seasons, t.episodes)
    : formatRuntime(t.runtimeMinutes)
}

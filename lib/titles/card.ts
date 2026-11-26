import { titleLengthLabel } from "./format"
import type { Title } from "./title"

type CardFields = Pick<
  Title,
  "year" | "genres" | "mediaType" | "runtimeMinutes" | "seasons" | "episodes"
>

// The swipe card's meta line: "1999 · Drama · 2h 19m" or
// "2011 · Drama · 8 seasons · 73 episodes". Empty when nothing is known.
export function cardMetaLine(t: CardFields): string {
  return [t.year, t.genres[0]?.name, titleLengthLabel(t)]
    .filter(Boolean)
    .join(" · ")
}

// The back-of-the-box sheet lists every genre: "1999 · Drama, Thriller · 2h 19m"
export function boxBackLine(t: CardFields): string {
  const genres = t.genres.map(g => g.name).join(", ")
  return [t.year, genres, titleLengthLabel(t)].filter(Boolean).join(" · ")
}

// Titles for ids (the poll's varchar ids or pool numbers), in the ids' order.
// Ids whose details didn't load are skipped, and repeats count once.
export function titlesForIds<T extends Pick<Title, "id">>(
  titles: T[],
  ids: (string | number)[]
): T[] {
  const byId = new Map(titles.map(t => [String(t.id), t]))
  const seen = new Set<string>()
  const picked: T[] = []
  for (const id of ids.map(String)) {
    const t = byId.get(id)
    if (!t || seen.has(id)) continue
    seen.add(id)
    picked.push(t)
  }
  return picked
}

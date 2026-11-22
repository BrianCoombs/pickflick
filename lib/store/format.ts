export function formatRuntime(
  minutes: number | null | undefined
): string | null {
  if (!minutes) return null
  const hours = Math.floor(minutes / 60)
  return hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

const SOURCE_NAMES = { trakt: "Trakt", letterboxd: "Letterboxd" } as const

// "Trakt", "Letterboxd", "Trakt + Letterboxd" or "no list"
export function linkedListLabel(
  sources: { sourceType: "trakt" | "letterboxd" }[]
): string {
  const types = new Set(sources.map(s => s.sourceType))
  const names = (["trakt", "letterboxd"] as const)
    .filter(type => types.has(type))
    .map(type => SOURCE_NAMES[type])
  return names.length ? names.join(" + ") : "no list"
}

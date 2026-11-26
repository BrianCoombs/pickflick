// US subscription streaming brands for the "Where to watch" filter.
// TMDb ids and logo paths verified 2026-11 against
// /watch/providers/movie?watch_region=US. Ids drift (HBO Max moved to 1899),
// so re-check now and then. The same ids work for /discover/tv.

export interface StreamingProvider {
  key: string
  name: string
  tmdbIds: readonly number[]
  logoPath: string
}

export const STREAMING_PROVIDERS = [
  {
    key: "netflix",
    name: "Netflix",
    tmdbIds: [8],
    logoPath: "/rK1KljqmbvO9HQa1PBFLILWah72.png"
  },
  {
    key: "prime",
    name: "Prime Video",
    tmdbIds: [9],
    logoPath: "/gMZdpavHmxFNnLpMHwVxfqeux2g.png"
  },
  {
    key: "disney",
    name: "Disney+",
    tmdbIds: [337],
    logoPath: "/5eZ872CghnHFLB1j8grszbrx0dx.png"
  },
  {
    key: "max",
    name: "HBO Max",
    tmdbIds: [1899],
    logoPath: "/skypuy7SXuugIQeYg0IglmzoKaS.png"
  },
  {
    key: "hulu",
    name: "Hulu",
    tmdbIds: [15],
    logoPath: "/44uAnmSqvA4yBOdbPWN8YgQHjWm.png"
  },
  {
    key: "apple",
    name: "Apple TV",
    tmdbIds: [350],
    logoPath: "/v9SnyvYt0U3KGgBH3Sbh3z4yODe.png"
  },
  {
    key: "peacock",
    name: "Peacock",
    tmdbIds: [386, 387],
    logoPath: "/a1UIdq5BrkcAxnxcUhFsNbXnxeu.png"
  },
  {
    key: "paramount",
    name: "Paramount+",
    tmdbIds: [2303, 2616],
    logoPath: "/4N4BMd0Mm0kHAmF7RZgL5lW3cwc.png"
  }
] as const satisfies readonly StreamingProvider[]

export type ProviderKey = (typeof STREAMING_PROVIDERS)[number]["key"]

export const PROVIDER_KEYS: readonly ProviderKey[] = STREAMING_PROVIDERS.map(
  p => p.key
)

export function isProviderKey(value: unknown): value is ProviderKey {
  return (
    typeof value === "string" &&
    (PROVIDER_KEYS as readonly string[]).includes(value)
  )
}

export function providerByKey(key: string): StreamingProvider | undefined {
  return STREAMING_PROVIDERS.find(p => p.key === key)
}

// TMDb ids for the chosen brands, in table order, without duplicates
export function providerIds(keys: readonly string[]): number[] {
  const chosen = new Set(keys)
  return Array.from(
    new Set(
      STREAMING_PROVIDERS.filter(p => chosen.has(p.key)).flatMap(p => [
        ...p.tmdbIds
      ])
    )
  )
}

// Plain <img> URL (next.config has no image.tmdb.org remote pattern)
export function providerLogoUrl(provider: StreamingProvider): string {
  return `https://image.tmdb.org/t/p/w92${provider.logoPath}`
}

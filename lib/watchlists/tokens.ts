const REFRESH_MARGIN_MS = 5 * 60 * 1000

// expiresAt is a millisecond timestamp
export function needsRefresh(
  expiresAt: number | undefined,
  now: number = Date.now()
): boolean {
  return expiresAt === undefined || expiresAt - now < REFRESH_MARGIN_MS
}

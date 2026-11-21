// Trakt only accepts redirect URIs registered on the app: production
// (pickflick.vercel.app) and localhost:3000. Preview deployments can't link.
export function traktRedirectUri(origin: string): string {
  return `${origin}/api/connect/trakt/callback`
}

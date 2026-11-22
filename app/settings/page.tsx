import { redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth/server"
import { getMyWatchlistSources } from "@/actions/db/watchlist-actions"
import { WatchlistSources } from "./_components/watchlist-sources"

const MESSAGES: Record<string, string> = {
  linked_trakt: "Trakt connected.",
  trakt_denied:
    "Trakt didn't allow the connection. If you didn't cancel, ask the PickFlick owner to add your Trakt username to the app.",
  trakt_state: "That Trakt sign-in expired. Please try again.",
  trakt_failed: "Something went wrong connecting Trakt. Please try again."
}

interface SettingsPageProps {
  searchParams: Promise<{ linked?: string; error?: string }>
}

export default async function SettingsPage({
  searchParams
}: SettingsPageProps) {
  const user = await getAuthenticatedUser()
  if (!user) redirect("/login")

  const { linked, error } = await searchParams
  const result = await getMyWatchlistSources()
  const { sources, letterboxdEnabled } = result.isSuccess
    ? result.data
    : { sources: [], letterboxdEnabled: false }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-12 pt-4">
      <h1 className="store-heading mb-6 text-3xl sm:text-4xl">
        Your
        <br />
        membership
      </h1>

      <WatchlistSources
        email={user.email}
        memberSince={
          user.createdAt
            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric"
              })
            : null
        }
        sources={sources}
        letterboxdEnabled={letterboxdEnabled}
        notice={
          linked
            ? {
                kind: "success",
                text: MESSAGES[`linked_${linked}`] ?? "Connected."
              }
            : error
              ? {
                  kind: "error",
                  text: MESSAGES[error] ?? "Something went wrong."
                }
              : undefined
        }
      />
    </div>
  )
}

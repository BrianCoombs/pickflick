"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"
import {
  removeWatchlistSource,
  saveLetterboxdUsername
} from "@/actions/db/watchlist-actions"
import type { LinkedSource, SourceType } from "@/lib/watchlists/sources"

interface WatchlistSourcesProps {
  sources: LinkedSource[]
  letterboxdEnabled: boolean
  notice?: { kind: "success" | "error"; text: string }
}

export function WatchlistSources({
  sources,
  letterboxdEnabled,
  notice
}: WatchlistSourcesProps) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [username, setUsername] = useState("")
  const [letterboxdError, setLetterboxdError] = useState<string | null>(null)

  const trakt = sources.find(s => s.sourceType === "trakt")
  const letterboxd = sources.find(s => s.sourceType === "letterboxd")

  const disconnect = (sourceType: SourceType) =>
    startTransition(async () => {
      const result = await removeWatchlistSource(sourceType)
      if (!result.isSuccess) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
      router.refresh()
    })

  const saveLetterboxd = () =>
    startTransition(async () => {
      setLetterboxdError(null)
      const result = await saveLetterboxdUsername(username)
      if (result.isSuccess) {
        setUsername("")
        toast({
          title: "Letterboxd linked",
          description: `@${result.data.username}`
        })
        router.refresh()
      } else {
        setLetterboxdError(result.message)
      }
    })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Watchlists</CardTitle>
        <CardDescription>
          Link the services where you keep movies you want to watch. In a
          session lobby, the host can build the movie pool from these lists.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {notice && (
          <Alert variant={notice.kind === "error" ? "destructive" : "default"}>
            <AlertDescription>{notice.text}</AlertDescription>
          </Alert>
        )}

        <section className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-medium">Trakt</h3>
            <p className="text-muted-foreground text-sm">
              {trakt ? `Connected as @${trakt.username}` : "Not connected"}
            </p>
          </div>
          {trakt ? (
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => disconnect("trakt")}
            >
              Disconnect
            </Button>
          ) : (
            <Button asChild>
              {/* A full page load, not a client navigation: it redirects to Trakt */}
              <a href="/api/connect/trakt">Connect Trakt</a>
            </Button>
          )}
        </section>

        {letterboxdEnabled && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-medium">Letterboxd</h3>
                <p className="text-muted-foreground text-sm">
                  {letterboxd
                    ? `Linked as @${letterboxd.username}`
                    : "Not linked"}
                </p>
              </div>
              {letterboxd && (
                <Button
                  variant="outline"
                  disabled={pending}
                  onClick={() => disconnect("letterboxd")}
                >
                  Remove
                </Button>
              )}
            </div>

            {!letterboxd && (
              <form
                className="space-y-2"
                onSubmit={e => {
                  e.preventDefault()
                  saveLetterboxd()
                }}
              >
                <Label htmlFor="letterboxd-username">Letterboxd username</Label>
                <div className="flex gap-2">
                  <Input
                    id="letterboxd-username"
                    placeholder="yourname"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={pending}
                  />
                  <Button type="submit" disabled={pending || !username.trim()}>
                    {pending ? "Checking..." : "Save"}
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">
                  Your Letterboxd watchlist must be public (Settings → Privacy
                  on letterboxd.com).
                </p>
                {letterboxdError && (
                  <p className="text-destructive text-sm">{letterboxdError}</p>
                )}
              </form>
            )}
          </section>
        )}
      </CardContent>

      <CardFooter>
        <p className="text-muted-foreground text-xs">
          PickFlick uses Trakt but is not endorsed or certified by Trakt.
        </p>
      </CardFooter>
    </Card>
  )
}

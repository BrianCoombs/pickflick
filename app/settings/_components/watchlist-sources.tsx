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
  email: string
  memberSince: string | null
  sources: LinkedSource[]
  letterboxdEnabled: boolean
  notice?: { kind: "success" | "error"; text: string }
}

export function WatchlistSources({
  email,
  memberSince,
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
    <Card className="overflow-hidden shadow-[6px_6px_0_#000]">
      {/* Membership card band */}
      <div className="bg-store-yellow text-store-navy flex items-center justify-between px-4 py-2">
        <span className="font-display text-sm">PICKFLICK VIDEO</span>
        <span className="text-[10px] font-semibold tracking-widest">
          MEMBER
        </span>
      </div>
      <div className="border-b border-dashed border-neutral-400 px-6 py-4 text-sm">
        <div className="truncate font-semibold">{email}</div>
        {memberSince && (
          <div className="text-neutral-600">Member since {memberSince}</div>
        )}
      </div>
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

        <section className="border-store-navy flex items-center justify-between gap-4 border-2 border-dashed p-3">
          <div>
            <h3 className="font-display">Trakt</h3>
            <p className="text-sm text-neutral-600">
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
          <section className="border-store-navy space-y-3 border-2 border-dashed p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display">Letterboxd</h3>
                <p className="text-sm text-neutral-600">
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
                <p className="text-xs text-neutral-600">
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
        <p className="text-xs text-neutral-600">
          PickFlick uses Trakt but is not endorsed or certified by Trakt.{" "}
          <a
            href="/privacy"
            className="text-store-red underline underline-offset-2"
          >
            Privacy
          </a>
        </p>
      </CardFooter>
    </Card>
  )
}

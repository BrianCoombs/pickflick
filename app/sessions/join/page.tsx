"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinMovieSession } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import Link from "next/link"

export default function JoinSessionPage() {
  const router = useRouter()
  const [sessionCode, setSessionCode] = useState("")
  const [loading, setLoading] = useState(false)

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!sessionCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session code",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const result = await joinMovieSession(sessionCode.trim())

      if (result.isSuccess && result.data) {
        toast({
          title: "Joined session!",
          description: "Let's start swiping"
        })
        router.push(`/sessions/${result.data.sessionId}`)
      } else {
        toast({
          title: "Error",
          description: result.message || "Invalid session code",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join session. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-12 pt-4">
      <h1 className="store-heading mb-6 text-3xl sm:text-4xl">
        Join with
        <br />a code
      </h1>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleJoinSession} className="space-y-4">
            <div>
              <Label htmlFor="session-code">Session code</Label>
              <Input
                id="session-code"
                type="text"
                placeholder="a1b2c3d4"
                value={sessionCode}
                onChange={e => setSessionCode(e.target.value)}
                className="mt-1 text-center font-mono text-lg tracking-widest"
                autoCapitalize="off"
                autoCorrect="off"
                autoFocus
              />
              <p className="mt-2 text-xs text-neutral-600">
                It&apos;s the 8 characters your friend sent you.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !sessionCode.trim()}
              className="w-full"
            >
              {loading ? "Joining..." : "Join"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-store-mist mt-6 text-sm">
        No code?{" "}
        <Link href="/sessions/new" className="underline underline-offset-4">
          Start a new session
        </Link>
      </p>
    </div>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { joinMovieSession } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { Users } from "lucide-react"

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
    <div className="container mx-auto max-w-md py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Join Session</h1>
        <p className="text-muted-foreground">
          Enter the session code shared by your friend
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Session Code
          </CardTitle>
          <CardDescription>
            Enter the 8-character code shared by your friend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleJoinSession} className="space-y-4">
            <div>
              <Label htmlFor="session-code">Enter Code</Label>
              <Input
                id="session-code"
                type="text"
                placeholder="e.g. a1b2c3d4"
                value={sessionCode}
                onChange={e => setSessionCode(e.target.value)}
                className="mt-1 text-center font-mono text-lg"
                autoFocus
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !sessionCode.trim()}
              className="w-full"
            >
              {loading ? "Joining..." : "Join Session"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-6 text-center">
        <p className="text-muted-foreground text-sm">
          Don't have a code?{" "}
          <Button
            variant="link"
            className="p-0"
            onClick={() => router.push("/sessions/new")}
          >
            Create a new session
          </Button>
        </p>
      </div>
    </div>
  )
}

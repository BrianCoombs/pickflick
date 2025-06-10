"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { createMovieSession } from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"
import { Film, Users } from "lucide-react"
import { MoviePreferencesForm } from "@/components/movie-preferences-form"

export default function NewSessionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCreateSession = async (preferences: any) => {
    setLoading(true)

    try {
      const result = await createMovieSession([], preferences)

      if (result.isSuccess && result.data) {
        toast({
          title: "Session created!",
          description: `Session code: ${result.data.sessionId.slice(0, 8)}`,
          duration: 10000 // Show for 10 seconds
        })
        router.push(`/sessions/${result.data.sessionId}`)
      } else {
        throw new Error(result.message || "Failed to create session")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Create New Session</h1>
        <p className="text-muted-foreground">
          Set your preferences and start swiping
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Film className="size-5" />
              Movie Preferences
            </CardTitle>
            <CardDescription>
              Choose your preferred genres and filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MoviePreferencesForm
              mode="create"
              onSubmit={handleCreateSession}
              loading={loading}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-5" />
              Invite Friends
            </CardTitle>
            <CardDescription>
              You can share the session code after creating it
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Create the session first, then share the code with your friends so
              they can join and start swiping together.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

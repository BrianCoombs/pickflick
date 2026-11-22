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
          description: `Session code: ${result.data.sessionId.slice(0, 8).toLowerCase()}`,
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
    <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-4">
      <h1 className="store-heading mb-6 text-3xl sm:text-4xl">New session</h1>

      <Card>
        <CardHeader>
          <CardTitle>What kind of movie?</CardTitle>
          <CardDescription>
            Pick genres and years, or leave them open. You can change this in
            the lobby.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MoviePreferencesForm
            mode="create"
            onSubmit={handleCreateSession}
            loading={loading}
          />
          <p className="mt-4 text-sm text-neutral-600">
            Want to use watchlists? Pick them in the lobby once friends join.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

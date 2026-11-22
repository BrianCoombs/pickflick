"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  deleteMovieSession,
  startMovieSession
} from "@/actions/db/movies-actions"
import { toast } from "@/hooks/use-toast"

// Start, delete, copy and share for a session, shared by the lobby and the
// swipe screen
export function useSessionControls(sessionId: string) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const shortCode = sessionId.slice(0, 8).toLowerCase()

  const startSession = async () => {
    try {
      const result = await startMovieSession(sessionId)
      if (!result.isSuccess) {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to start session",
        variant: "destructive"
      })
    }
  }

  const deleteSession = async () => {
    setDeleting(true)
    try {
      const result = await deleteMovieSession(sessionId)
      if (result.isSuccess) {
        router.push("/sessions")
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive"
        })
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete session",
        variant: "destructive"
      })
    } finally {
      setDeleting(false)
    }
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(shortCode)
      toast({ title: "Copied", description: `Session code ${shortCode}` })
    } catch {
      toast({
        title: "Error",
        description: "Couldn't copy the code",
        variant: "destructive"
      })
    }
  }

  const shareSession = async () => {
    const shareData = {
      title: "Join my PickFlick session",
      text: `Join my PickFlick session with code ${shortCode}`,
      url: `${window.location.origin}/sessions/join`
    }
    try {
      if (navigator.share && navigator.canShare?.(shareData)) {
        await navigator.share(shareData)
      } else {
        await copyCode()
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast({
          title: "Error",
          description: "Couldn't share the session",
          variant: "destructive"
        })
      }
    }
  }

  return {
    shortCode,
    deleting,
    startSession,
    deleteSession,
    copyCode,
    shareSession
  }
}

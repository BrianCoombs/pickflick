"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface UseSessionParticipantsProps {
  sessionId: string
  initialCount: number
  initialStarted?: boolean
}

export function useSessionParticipants({ sessionId, initialCount, initialStarted = false }: UseSessionParticipantsProps) {
  const [participantCount, setParticipantCount] = useState(initialCount)
  const [sessionStarted, setSessionStarted] = useState(initialStarted)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  // Set once we've sent this person to the match page, so the poll stops acting
  const leavingRef = useRef(false)

  const fetchParticipantCount = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}/participants`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch participant count")
      }

      const data = await response.json()
      if (leavingRef.current) return

      // Someone's swipe made the match: go straight to it. Without this the
      // status change reads as "not started" and flashes the lobby first.
      if (data.status === "completed") {
        leavingRef.current = true
        router.replace(`/sessions/${sessionId}/match`)
        return
      }

      if (data.count !== participantCount || data.sessionStarted !== sessionStarted) {
        setParticipantCount(data.count)
        setSessionStarted(data.sessionStarted)
        // Refresh the page data when participant count or session status changes
        router.refresh()
      }
    } catch (error) {
      console.error("Error fetching participant count:", error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, participantCount, sessionStarted, router])

  useEffect(() => {
    // Poll every 3 seconds for updates
    const interval = setInterval(fetchParticipantCount, 3000)

    // Clean up on unmount
    return () => clearInterval(interval)
  }, [fetchParticipantCount])

  return {
    participantCount,
    sessionStarted,
    isLoading,
    refetch: fetchParticipantCount
  }
}
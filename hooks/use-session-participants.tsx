"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { resetNoticeDue, type ParticipantsResponse } from "@/lib/sessions/poll"
import type { NextStep } from "@/lib/sessions/progress"

interface UseSessionParticipantsProps {
  sessionId: string
  initialCount: number
  initialStarted?: boolean
  // From the page's server render. Without them the first poll sets the
  // starting point (so nothing refreshes or flags on that first poll).
  initialPoolVersion?: number
  initialResetVersion?: number
  // The host made any reset themselves, so they never get the notice
  isHost?: boolean
}

export function useSessionParticipants({
  sessionId,
  initialCount,
  initialStarted = false,
  initialPoolVersion,
  initialResetVersion,
  isHost = false
}: UseSessionParticipantsProps) {
  const [participantCount, setParticipantCount] = useState(initialCount)
  const [sessionStarted, setSessionStarted] = useState(initialStarted)
  const [poolVersion, setPoolVersion] = useState<number | null>(
    initialPoolVersion ?? null
  )
  const [resetVersion, setResetVersion] = useState<number | null>(
    initialResetVersion ?? null
  )
  const [progress, setProgress] = useState<ParticipantsResponse["progress"]>([])
  const [done, setDone] = useState(false)
  const [nextStep, setNextStep] = useState<NextStep | null>(null)
  const [agreedIds, setAgreedIds] = useState<string[]>([])
  const [wasReset, setWasReset] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Set once we've sent this person to the match page, so the poll stops acting
  const leavingRef = useRef(false)
  const inFlightRef = useRef(false)
  // The last values acted on, in refs so the poll callback stays stable
  const countRef = useRef(initialCount)
  const startedRef = useRef(initialStarted)
  const poolVersionRef = useRef<number | null>(initialPoolVersion ?? null)
  // reset_version the reset notice compares against: the page's value, then
  // the latest one acknowledged
  const resetBaselineRef = useRef<number | null>(initialResetVersion ?? null)
  const latestResetRef = useRef<number | null>(initialResetVersion ?? null)
  const isHostRef = useRef(isHost)

  useEffect(() => {
    isHostRef.current = isHost
  }, [isHost])

  const fetchParticipantCount = useCallback(async () => {
    if (inFlightRef.current || leavingRef.current) return
    inFlightRef.current = true
    try {
      setIsLoading(true)
      const response = await fetch(`/api/sessions/${sessionId}/participants`)

      if (!response.ok) {
        throw new Error("Failed to fetch participant count")
      }

      const data: ParticipantsResponse = await response.json()
      if (leavingRef.current) return

      // The session is over (a match, everyone finished, or the host ended
      // it): go straight to the results. Without this the status change reads
      // as "not started" and flashes the lobby first.
      if (data.status === "completed") {
        leavingRef.current = true
        router.replace(`/sessions/${sessionId}/match`)
        return
      }

      setProgress(data.progress)
      setDone(data.done)
      setNextStep(data.nextStep)
      setAgreedIds(data.agreedIds)
      latestResetRef.current = data.resetVersion
      setResetVersion(data.resetVersion)

      if (resetBaselineRef.current === null) {
        resetBaselineRef.current = data.resetVersion
      } else if (
        resetNoticeDue(
          resetBaselineRef.current,
          data.resetVersion,
          isHostRef.current
        )
      ) {
        setWasReset(true)
      }

      const poolChanged =
        poolVersionRef.current !== null &&
        data.poolVersion !== poolVersionRef.current
      poolVersionRef.current = data.poolVersion
      setPoolVersion(data.poolVersion)

      if (
        data.count !== countRef.current ||
        data.sessionStarted !== startedRef.current ||
        poolChanged
      ) {
        countRef.current = data.count
        startedRef.current = data.sessionStarted
        setParticipantCount(data.count)
        setSessionStarted(data.sessionStarted)
        // Re-render the page with the new people, status or pool
        router.refresh()
      }
    } catch (error) {
      console.error("Error fetching participant count:", error)
    } finally {
      inFlightRef.current = false
      setIsLoading(false)
    }
  }, [sessionId, router])

  // Hides the reset notice until the host resets again
  const acknowledgeReset = useCallback(() => {
    setWasReset(false)
    if (latestResetRef.current !== null) {
      resetBaselineRef.current = latestResetRef.current
    }
  }, [])

  useEffect(() => {
    // Poll every 3 seconds for updates
    const interval = setInterval(fetchParticipantCount, 3000)

    // Clean up on unmount
    return () => clearInterval(interval)
  }, [fetchParticipantCount])

  return {
    participantCount,
    sessionStarted,
    poolVersion,
    resetVersion,
    progress,
    done,
    nextStep,
    agreedIds,
    wasReset,
    acknowledgeReset,
    isLoading,
    refetch: fetchParticipantCount
  }
}

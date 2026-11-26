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
  const [progress, setProgress] = useState<ParticipantsResponse["progress"]>([])
  const [nextStep, setNextStep] = useState<NextStep | null>(null)
  const [agreedIds, setAgreedIds] = useState<string[]>([])
  const [wasReset, setWasReset] = useState(false)
  // The host deleted the session (the poll got a 404)
  const [deleted, setDeleted] = useState(false)
  const router = useRouter()

  // Set once this person is on their way out (to the results, or the session
  // is gone), so the poll stops and nothing navigates twice
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

  // The one way to the results page. The last swipe, the poll and the host's
  // End now can all finish the session at once; only the first one navigates.
  // replace, so Back doesn't land on a finished session and bounce forward.
  const goToResults = useCallback(() => {
    if (leavingRef.current) return
    leavingRef.current = true
    router.replace(`/sessions/${sessionId}/match`)
  }, [router, sessionId])

  const fetchParticipantCount = useCallback(async () => {
    if (inFlightRef.current || leavingRef.current) return
    inFlightRef.current = true
    try {
      const response = await fetch(`/api/sessions/${sessionId}/participants`)
      if (leavingRef.current) return

      if (response.status === 404) {
        leavingRef.current = true
        setDeleted(true)
        return
      }
      if (!response.ok) {
        throw new Error("Failed to fetch participant count")
      }

      const data: ParticipantsResponse = await response.json()
      if (leavingRef.current) return

      // The session is over (a match, everyone finished, or the host ended
      // it): go straight to the results. Without this the status change reads
      // as "not started" and flashes the lobby first.
      if (data.status === "completed") {
        goToResults()
        return
      }

      setProgress(data.progress)
      setNextStep(data.nextStep)
      setAgreedIds(data.agreedIds)
      latestResetRef.current = data.resetVersion

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
    }
  }, [sessionId, router, goToResults])

  // Hides the reset notice until the host resets again
  const acknowledgeReset = useCallback(() => {
    setWasReset(false)
    if (latestResetRef.current !== null) {
      resetBaselineRef.current = latestResetRef.current
    }
  }, [])

  useEffect(() => {
    // Once straight away (the waiting counter and agreed chip need progress
    // and agreed ids), then every 3 seconds. Stops once leaving or deleted.
    void fetchParticipantCount()
    const interval = setInterval(() => {
      if (leavingRef.current) clearInterval(interval)
      else void fetchParticipantCount()
    }, 3000)
    return () => clearInterval(interval)
  }, [fetchParticipantCount])

  return {
    participantCount,
    sessionStarted,
    progress,
    nextStep,
    agreedIds,
    wasReset,
    acknowledgeReset,
    deleted,
    goToResults
  }
}

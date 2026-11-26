import assert from "node:assert/strict"
import { test } from "node:test"
import { participantsResponse, resetNoticeDue } from "./poll"

const session = {
  userIds: ["a", "b"],
  status: "started",
  matchMode: "all",
  mediaType: "tv",
  poolVersion: 3,
  resetVersion: 1,
  poolSize: 50
}

// participantsResponse

test("a started all-mode session reports progress, the next step and agreed titles", () => {
  assert.deepEqual(
    participantsResponse(session, {
      progress: [
        { userId: "a", swiped: 50, remaining: 0 },
        { userId: "b", swiped: 38, remaining: 12 }
      ],
      done: false,
      step: "keep-swiping",
      agreed: ["7", "3"]
    }),
    {
      count: 2,
      status: "started",
      sessionStarted: true,
      matchMode: "all",
      mediaType: "tv",
      poolVersion: 3,
      resetVersion: 1,
      poolSize: 50,
      progress: [
        { userId: "a", remaining: 0 },
        { userId: "b", remaining: 12 }
      ],
      done: false,
      nextStep: "keep-swiping",
      agreedIds: ["7", "3"],
      agreedCount: 2
    }
  )
})

test("first mode never sends agreed titles", () => {
  const body = participantsResponse(
    { ...session, matchMode: "first" },
    { progress: [], done: false, step: "keep-swiping", agreed: ["7"] }
  )
  assert.deepEqual(body.agreedIds, [])
  assert.equal(body.agreedCount, 0)
})

test("only the response fields are sent, not the rest of the settle result", () => {
  const body = participantsResponse(session, {
    progress: [{ userId: "a", swiped: 3, remaining: 0 }],
    done: true,
    step: "finish",
    agreed: [],
    matchedMovieId: "9"
  } as never)
  assert.equal("matchedMovieId" in body, false)
  assert.equal("swiped" in body.progress[0], false)
})

test("outside swiping there's no progress", () => {
  for (const status of ["active", "completed"]) {
    const body = participantsResponse(
      { ...session, status },
      {
        progress: [{ userId: "a", swiped: 1, remaining: 2 }],
        done: true,
        step: "finish",
        agreed: ["1"]
      }
    )
    assert.equal(body.sessionStarted, false)
    assert.deepEqual(body.progress, [])
    assert.equal(body.done, false)
    assert.equal(body.nextStep, null)
    assert.deepEqual(body.agreedIds, [])
  }
})

test("unknown modes and media types read as the defaults", () => {
  const body = participantsResponse(
    { ...session, status: "active", matchMode: "weird", mediaType: "radio" },
    null
  )
  assert.equal(body.matchMode, "first")
  assert.equal(body.mediaType, "movie")
})

// resetNoticeDue

test("a reset after the page loaded shows the notice", () => {
  assert.equal(resetNoticeDue(0, 1, false), true)
})

test("no reset, no notice", () => {
  assert.equal(resetNoticeDue(2, 2, false), false)
})

test("the host who reset the session doesn't get the notice", () => {
  assert.equal(resetNoticeDue(0, 1, true), false)
})

test("without a starting value nothing shows", () => {
  assert.equal(resetNoticeDue(null, 5, false), false)
})

test("a lower value (a stale response) shows nothing", () => {
  assert.equal(resetNoticeDue(3, 2, false), false)
})

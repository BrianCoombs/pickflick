import assert from "node:assert/strict"
import { test } from "node:test"
import {
  emptyBatchReason,
  firstMatchResult,
  isInPool,
  isShortPool,
  parsePool,
  settingsChange,
  settleDecision,
  swipeGate
} from "./settle"

const swipesFor = (
  userId: string,
  ids: (number | string)[],
  direction = "right"
) => ids.map(movieId => ({ userId, movieId, direction }))

// parsePool / isInPool

test("parsePool keeps the stored numbers in order", () => {
  assert.deepEqual(parsePool([3, 1, 2]), [3, 1, 2])
})

test("parsePool reads anything that isn't a list as an empty pool", () => {
  assert.deepEqual(parsePool(null), [])
  assert.deepEqual(parsePool(undefined), [])
  assert.deepEqual(parsePool({ 0: 1 }), [])
})

test("parsePool converts numeric strings and drops junk", () => {
  assert.deepEqual(parsePool([1, "2", "x", null, 3.5, -4, 5]), [1, 2, 5])
})

test("isInPool compares number pool ids with string swipe ids", () => {
  assert.equal(isInPool([1, 2, 3], "2"), true)
  assert.equal(isInPool([1, 2, 3], 3), true)
  assert.equal(isInPool([1, 2, 3], "4"), false)
  assert.equal(isInPool([], "1"), false)
})

// settleDecision

const base = {
  status: "started",
  userIds: ["a", "b"],
  pool: [1, 2, 3]
}

test("all mode keeps swiping until everyone has finished", () => {
  const result = settleDecision({
    ...base,
    matchMode: "all",
    swipes: [...swipesFor("a", [1, 2, 3]), ...swipesFor("b", [1, 2])]
  })
  assert.equal(result.done, false)
  assert.equal(result.step, "keep-swiping")
  assert.equal(result.completion, null)
  assert.deepEqual(result.agreed, ["1", "2"])
})

test("all mode completes with every agreed title once everyone is done", () => {
  const result = settleDecision({
    ...base,
    matchMode: "all",
    swipes: [
      ...swipesFor("a", [1, 2, 3]),
      ...swipesFor("b", [1, 3]),
      ...swipesFor("b", [2], "left")
    ]
  })
  assert.equal(result.done, true)
  assert.equal(result.step, "finish")
  assert.deepEqual(result.completion, {
    matchedMovieId: null,
    movieIds: ["1", "3"]
  })
})

test("all mode with nothing agreed offers more instead of completing", () => {
  const result = settleDecision({
    ...base,
    matchMode: "all",
    swipes: [...swipesFor("a", [1, 2, 3], "left"), ...swipesFor("b", [1, 2, 3])]
  })
  assert.equal(result.step, "offer-more")
  assert.equal(result.completion, null)
})

test("first mode completes on the first agreed title in pool order", () => {
  // The swipe that made the match saved but its request failed before the
  // session was marked: the poll finishes it
  const result = settleDecision({
    ...base,
    matchMode: "first",
    swipes: [...swipesFor("a", [3, 2]), ...swipesFor("b", [3, 2])]
  })
  assert.equal(result.done, false)
  assert.deepEqual(result.completion, {
    matchedMovieId: "2",
    movieIds: ["2"]
  })
})

test("first mode with no agreement doesn't complete", () => {
  const result = settleDecision({
    ...base,
    matchMode: "first",
    swipes: [...swipesFor("a", [1, 2, 3]), ...swipesFor("b", [1], "left")]
  })
  assert.equal(result.completion, null)
})

test("only a started session can complete", () => {
  for (const status of ["active", "completed"]) {
    for (const matchMode of ["first", "all"] as const) {
      const result = settleDecision({
        ...base,
        status,
        matchMode,
        swipes: [...swipesFor("a", [1, 2, 3]), ...swipesFor("b", [1, 2, 3])]
      })
      assert.equal(result.completion, null, `${status} ${matchMode}`)
    }
  }
})

test("progress only counts members' swipes on pool titles", () => {
  const result = settleDecision({
    ...base,
    matchMode: "all",
    swipes: [...swipesFor("a", [1, 99]), ...swipesFor("stranger", [1, 2, 3])]
  })
  assert.deepEqual(result.progress, [
    { userId: "a", swiped: 1, remaining: 2 },
    { userId: "b", swiped: 0, remaining: 3 }
  ])
})

test("an empty pool never completes", () => {
  const result = settleDecision({
    ...base,
    pool: [],
    matchMode: "all",
    swipes: []
  })
  assert.equal(result.done, false)
  assert.equal(result.completion, null)
})

// settingsChange

test("settings can change in the lobby without a reset", () => {
  assert.deepEqual(settingsChange("active"), { allowed: true, reset: false })
})

test("settings changed mid-session reset everyone", () => {
  assert.deepEqual(settingsChange("started"), { allowed: true, reset: true })
})

test("settings can't change once the session is over", () => {
  assert.deepEqual(settingsChange("completed"), {
    allowed: false,
    reset: false
  })
  assert.deepEqual(settingsChange("expired"), { allowed: false, reset: false })
})

// isShortPool

test("a pool under one batch is short", () => {
  assert.equal(isShortPool(49), true)
  assert.equal(isShortPool(50), false)
  assert.equal(isShortPool(0), true)
  assert.equal(isShortPool(10, 10), false)
})

// swipeGate

const live = {
  status: "started",
  userIds: ["a", "b"],
  moviePool: [1, 2, 3],
  resetVersion: 2
}
const swipe = { userId: "a", movieId: "2", resetVersion: 2 }

test("swipeGate lets a member swipe a pool title in a started session", () => {
  assert.equal(swipeGate(live, swipe), "ok")
})

test("swipeGate reports a missing session", () => {
  assert.equal(swipeGate(undefined, swipe), "missing")
})

test("swipeGate turns away non-members", () => {
  assert.equal(swipeGate(live, { ...swipe, userId: "z" }), "not-member")
})

test("swipeGate sends swipes on a finished session to the results", () => {
  assert.equal(swipeGate({ ...live, status: "completed" }, swipe), "completed")
})

test("swipeGate refuses swipes in the lobby or an expired session", () => {
  assert.equal(swipeGate({ ...live, status: "active" }, swipe), "closed")
  assert.equal(swipeGate({ ...live, status: "expired" }, swipe), "closed")
})

test("swipeGate refuses a swipe validated before a host reset", () => {
  assert.equal(swipeGate({ ...live, resetVersion: 3 }, swipe), "reset")
})

test("swipeGate checks the title against the current pool", () => {
  assert.equal(swipeGate(live, { ...swipe, movieId: "9" }), "not-in-pool")
  assert.equal(
    swipeGate({ ...live, moviePool: [1, 3] }, { ...swipe, movieId: "2" }),
    "not-in-pool"
  )
})

test("swipeGate allows a pool that grew (Add more) without a reset", () => {
  assert.equal(
    swipeGate({ ...live, moviePool: [1, 2, 3, 4] }, { ...swipe, movieId: "4" }),
    "ok"
  )
})

// firstMatchResult

test("firstMatchResult: the winning swipe reports its own title", () => {
  assert.deepEqual(firstMatchResult("7", true, undefined), {
    matched: true,
    movieId: "7"
  })
})

test("firstMatchResult: losing to another completion reports the real match", () => {
  assert.deepEqual(
    firstMatchResult("7", false, { status: "completed", matchedMovieId: "5" }),
    { matched: true, movieId: "5" }
  )
})

test("firstMatchResult: losing because the pool changed is no match", () => {
  assert.deepEqual(
    firstMatchResult("7", false, { status: "started", matchedMovieId: null }),
    { matched: false }
  )
  assert.deepEqual(firstMatchResult("7", false, undefined), { matched: false })
})

test("firstMatchResult: a session completed with no single match id", () => {
  assert.deepEqual(
    firstMatchResult("7", false, { status: "completed", matchedMovieId: null }),
    { matched: true, movieId: undefined }
  )
})

// emptyBatchReason

test("an empty batch with no failures means the source ran out", () => {
  assert.equal(
    emptyBatchReason({ failedSources: 0, threw: false }),
    "exhausted"
  )
})

test("an empty batch after a failed fetch is a failure, not exhaustion", () => {
  assert.equal(emptyBatchReason({ failedSources: 1, threw: false }), "failed")
  assert.equal(emptyBatchReason({ failedSources: 0, threw: true }), "failed")
})

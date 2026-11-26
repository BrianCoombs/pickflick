import assert from "node:assert/strict"
import { test } from "node:test"
import {
  isInPool,
  isShortPool,
  parsePool,
  settingsChange,
  settleDecision
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

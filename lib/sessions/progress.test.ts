import assert from "node:assert/strict"
import { test } from "node:test"
import {
  agreedTitles,
  appendBatch,
  BATCH_SIZE,
  canAddMore,
  everyoneDone,
  memberProgress,
  nextCard,
  nextStep,
  parseMatchMode,
  POOL_CAP
} from "./progress"

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => from + i)

const swipesFor = (
  userId: string,
  ids: (number | string)[],
  direction = "right"
) => ids.map(movieId => ({ userId, movieId, direction }))

// nextCard

test("no swipes starts on the first card", () => {
  assert.deepEqual(nextCard([1, 2, 3], []), { index: 0, position: 1, total: 3 })
})

test("3 of 5 swiped resumes on the fourth card", () => {
  assert.deepEqual(nextCard([1, 2, 3, 4, 5], [1, 2, 3]), {
    index: 3,
    position: 4,
    total: 5
  })
})

test("a gap resumes on the first unswiped card", () => {
  assert.deepEqual(nextCard([1, 2, 3], [1, 3]), {
    index: 1,
    position: 3,
    total: 3
  })
})

test("string ids from the database match number pool ids", () => {
  assert.deepEqual(nextCard([1, 2, 3], ["1", "2"]), {
    index: 2,
    position: 3,
    total: 3
  })
})

test("swiped ids outside the pool are ignored", () => {
  assert.deepEqual(nextCard([1, 2, 3], [1, 99, "42"]), {
    index: 1,
    position: 2,
    total: 3
  })
})

test("every id swiped gives index -1 and position total + 1", () => {
  assert.deepEqual(nextCard([1, 2, 3], [3, 2, 1]), {
    index: -1,
    position: 4,
    total: 3
  })
})

test("an empty pool has no next card", () => {
  assert.deepEqual(nextCard([], [1]), { index: -1, position: 1, total: 0 })
})

test("a grown pool resumes after the first batch", () => {
  assert.deepEqual(nextCard(range(1, 100), range(1, 50)), {
    index: 50,
    position: 51,
    total: 100
  })
})

test("duplicate swiped ids don't count twice", () => {
  assert.deepEqual(nextCard([1, 2, 3], [1, "1", 1]), {
    index: 1,
    position: 2,
    total: 3
  })
})

test("nextCard accepts any iterable, such as a Set", () => {
  assert.deepEqual(nextCard([1, 2, 3], new Set([1])), {
    index: 1,
    position: 2,
    total: 3
  })
})

// parseMatchMode

test("only first and all are match modes; anything else is first", () => {
  assert.equal(parseMatchMode("first"), "first")
  assert.equal(parseMatchMode("all"), "all")
  assert.equal(parseMatchMode("ALL"), "first")
  assert.equal(parseMatchMode(""), "first")
  assert.equal(parseMatchMode(undefined), "first")
  assert.equal(parseMatchMode(null), "first")
  assert.equal(parseMatchMode({ toString: () => "all" }), "first")
})

// memberProgress / everyoneDone

test("progress counts each member's swipes on pool ids", () => {
  const pool = [1, 2, 3]
  const swipes = [...swipesFor("a", [1, 2]), ...swipesFor("b", [3], "left")]
  assert.deepEqual(memberProgress(["a", "b"], pool, swipes), [
    { userId: "a", swiped: 2, remaining: 1 },
    { userId: "b", swiped: 1, remaining: 2 }
  ])
})

test("swipes on ids outside the pool don't count", () => {
  const swipes = swipesFor("a", [1, 2, 99])
  assert.deepEqual(memberProgress(["a"], [1, 2, 3], swipes), [
    { userId: "a", swiped: 2, remaining: 1 }
  ])
  assert.equal(everyoneDone(["a"], [1, 2], swipesFor("a", [1, 99])), false)
})

test("swipes by non-members don't count", () => {
  const swipes = [...swipesFor("a", [1, 2]), ...swipesFor("intruder", [1, 2])]
  assert.deepEqual(memberProgress(["a", "b"], [1, 2], swipes), [
    { userId: "a", swiped: 2, remaining: 0 },
    { userId: "b", swiped: 0, remaining: 2 }
  ])
  assert.equal(everyoneDone(["a", "b"], [1, 2], swipes), false)
})

test("number pool ids match string swipe ids", () => {
  const swipes = [...swipesFor("a", ["1", "2"]), ...swipesFor("b", ["1", "2"])]
  assert.equal(everyoneDone(["a", "b"], [1, 2], swipes), true)
  assert.deepEqual(memberProgress(["a"], [1, 2], swipes), [
    { userId: "a", swiped: 2, remaining: 0 }
  ])
})

test("repeated swipes on one id count once", () => {
  const swipes = swipesFor("a", [1, "1", 1])
  assert.deepEqual(memberProgress(["a"], [1, 2], swipes), [
    { userId: "a", swiped: 1, remaining: 1 }
  ])
})

test("an empty pool is never done", () => {
  assert.equal(everyoneDone(["a"], [], []), false)
})

test("no members is never done", () => {
  assert.equal(everyoneDone([], [1, 2], swipesFor("a", [1, 2])), false)
})

test("a member with 49 of 50 swiped is not done", () => {
  const pool = range(1, 50)
  const swipes = [...swipesFor("a", pool), ...swipesFor("b", range(1, 49))]
  assert.equal(everyoneDone(["a", "b"], pool, swipes), false)
  assert.deepEqual(memberProgress(["b"], pool, swipes), [
    { userId: "b", swiped: 49, remaining: 1 }
  ])
})

test("left swipes count toward done", () => {
  const swipes = [...swipesFor("a", [1, 2], "left"), ...swipesFor("b", [1, 2])]
  assert.equal(everyoneDone(["a", "b"], [1, 2], swipes), true)
})

// agreedTitles

test("left swipes don't count as agreement", () => {
  const swipes = [...swipesFor("a", [1, 2]), ...swipesFor("b", [1, 2], "left")]
  assert.deepEqual(agreedTitles(["a", "b"], [1, 2], swipes), [])
})

test("old super swipes count as likes", () => {
  const swipes = [...swipesFor("a", [1], "super"), ...swipesFor("b", ["1"])]
  assert.deepEqual(agreedTitles(["a", "b"], [1, 2], swipes), ["1"])
})

test("agreed titles keep pool order", () => {
  const swipes = [
    ...swipesFor("a", [3, 1, 2]),
    ...swipesFor("b", ["2", "3", "1"])
  ]
  assert.deepEqual(agreedTitles(["a", "b"], [3, 1, 2], swipes), ["3", "1", "2"])
})

test("a title liked by only some members is left out", () => {
  const swipes = [
    ...swipesFor("a", [1, 2]),
    ...swipesFor("b", [2]),
    ...swipesFor("b", [1], "left")
  ]
  assert.deepEqual(agreedTitles(["a", "b"], [1, 2], swipes), ["2"])
})

test("likes outside the pool or from non-members aren't agreement", () => {
  const swipes = [...swipesFor("a", [1, 99]), ...swipesFor("intruder", [1, 99])]
  assert.deepEqual(agreedTitles(["a", "b"], [1], swipes), [])
  assert.deepEqual(agreedTitles(["a"], [1], swipes), ["1"])
  assert.deepEqual(agreedTitles([], [1], swipes), [])
})

// nextStep

test("done with nothing agreed offers more, in either mode", () => {
  assert.equal(nextStep("first", true, 0), "offer-more")
  assert.equal(nextStep("all", true, 0), "offer-more")
})

test("all mode finishes once everyone is done and something was agreed", () => {
  assert.equal(nextStep("all", true, 2), "finish")
})

test("not done keeps swiping in either mode", () => {
  assert.equal(nextStep("first", false, 0), "keep-swiping")
  assert.equal(nextStep("all", false, 0), "keep-swiping")
  assert.equal(nextStep("all", false, 3), "keep-swiping")
})

// canAddMore

const ready = {
  status: "started",
  done: true,
  agreedCount: 0,
  poolLength: 50
}

test("more can be added once everyone is done and nothing was agreed", () => {
  assert.equal(canAddMore(ready), true)
})

test("no more once the session is completed or still in the lobby", () => {
  assert.equal(canAddMore({ ...ready, status: "completed" }), false)
  assert.equal(canAddMore({ ...ready, status: "active" }), false)
})

test("no more while someone is still swiping", () => {
  assert.equal(canAddMore({ ...ready, done: false }), false)
})

test("no more once anything was agreed", () => {
  assert.equal(canAddMore({ ...ready, agreedCount: 1 }), false)
})

test("no more once the pool is at the cap", () => {
  assert.equal(canAddMore({ ...ready, poolLength: POOL_CAP }), false)
  assert.equal(canAddMore({ ...ready, poolLength: POOL_CAP - 1 }), true)
  assert.equal(canAddMore({ ...ready, poolLength: 100, cap: 100 }), false)
})

// appendBatch

test("the cap is 500 and a batch is 50", () => {
  assert.equal(POOL_CAP, 500)
  assert.equal(BATCH_SIZE, 50)
})

test("a batch is appended after the existing pool", () => {
  assert.deepEqual(appendBatch([1, 2], [3, 4]), {
    pool: [1, 2, 3, 4],
    added: 2
  })
})

test("repeats against the pool and inside the batch are dropped", () => {
  assert.deepEqual(appendBatch([1, 2], [2, 3, 3, 1, 4]), {
    pool: [1, 2, 3, 4],
    added: 2
  })
})

test("an empty batch adds nothing", () => {
  assert.deepEqual(appendBatch([1, 2], []), { pool: [1, 2], added: 0 })
})

test("the result is cut at the cap", () => {
  assert.deepEqual(appendBatch([1, 2, 3], [4, 5, 6], 4), {
    pool: [1, 2, 3, 4],
    added: 1
  })
  const full = appendBatch(range(1, 480), range(481, 530))
  assert.equal(full.pool.length, POOL_CAP)
  assert.equal(full.added, 20)
})

test("a pool already at the cap takes nothing", () => {
  assert.deepEqual(appendBatch([1, 2], [3], 2), { pool: [1, 2], added: 0 })
})

test("appendBatch doesn't change the pool it was given", () => {
  const pool = [1, 2]
  appendBatch(pool, [3])
  assert.deepEqual(pool, [1, 2])
})

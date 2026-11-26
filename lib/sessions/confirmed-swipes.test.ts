import assert from "node:assert/strict"
import { test } from "node:test"
import { addConfirmed, confirmedFor, emptyConfirmed } from "./confirmed-swipes"

test("confirmed swipes are kept for the same reset version", () => {
  const state = addConfirmed(emptyConfirmed(0), 0, 0, "603")
  assert.deepEqual([...confirmedFor(state, 0)], ["603"])
})

test("a new pool from Add more keeps them", () => {
  // Add more bumps pool_version but not reset_version
  let state = addConfirmed(emptyConfirmed(2), 2, 2, "603")
  state = addConfirmed(state, 2, 2, "604")
  assert.deepEqual([...confirmedFor(state, 2)], ["603", "604"])
})

test("a reset clears them", () => {
  const state = addConfirmed(emptyConfirmed(0), 0, 0, "603")
  assert.deepEqual([...confirmedFor(state, 1)], [])
})

test("a swipe started before a reset is dropped when it lands after", () => {
  const state = emptyConfirmed(1)
  assert.equal(addConfirmed(state, 0, 1, "603"), state)
})

test("the first swipe after a reset starts a fresh list", () => {
  const before = addConfirmed(emptyConfirmed(0), 0, 0, "603")
  const after = addConfirmed(before, 1, 1, "700")
  assert.deepEqual([...confirmedFor(after, 1)], ["700"])
})

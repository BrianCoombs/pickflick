import assert from "node:assert/strict"
import { test } from "node:test"
import { shuffle } from "./shuffle"

test("returns every item once", () => {
  const items = Array.from({ length: 30 }, (_, i) => i)
  assert.deepEqual(
    [...shuffle(items)].sort((a, b) => a - b),
    items
  )
})

test("leaves the input alone", () => {
  const items = [1, 2, 3, 4]
  shuffle(items, () => 0)
  assert.deepEqual(items, [1, 2, 3, 4])
})

test("follows the random source", () => {
  // random() = 0 always swaps with index 0: [1,2,3,4] -> [2,3,4,1]
  assert.deepEqual(
    shuffle([1, 2, 3, 4], () => 0),
    [2, 3, 4, 1]
  )
  // random() just under 1 swaps each item with itself
  assert.deepEqual(
    shuffle([1, 2, 3, 4], () => 0.999),
    [1, 2, 3, 4]
  )
})

test("handles an empty list", () => {
  assert.deepEqual(shuffle([]), [])
})

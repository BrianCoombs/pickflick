import assert from "node:assert/strict"
import { test } from "node:test"
import { swipeDecision } from "./swipe"

const width = 300

test("a short drag springs back", () => {
  assert.equal(swipeDecision(50, 0, width), null)
  assert.equal(swipeDecision(-60, 100, width), null)
})

test("dragging past 30% of the card decides the swipe", () => {
  assert.equal(swipeDecision(90, 0, width), "right")
  assert.equal(swipeDecision(-90, 0, width), "left")
})

test("a fast flick decides the swipe even when the drag is short", () => {
  assert.equal(swipeDecision(45, 800, width), "right")
  assert.equal(swipeDecision(-45, -800, width), "left")
})

test("a flick against the drag direction or a tiny twitch doesn't count", () => {
  assert.equal(swipeDecision(45, -800, width), null)
  assert.equal(swipeDecision(10, 900, width), null)
})

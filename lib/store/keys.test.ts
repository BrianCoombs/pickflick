import assert from "node:assert/strict"
import { test } from "node:test"
import { swipeKeyDirection } from "./keys"

const press = (key: string, extra: Record<string, unknown> = {}) => ({
  key,
  repeat: false,
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  defaultPrevented: false,
  targetTag: "BODY",
  targetEditable: false,
  ...extra
})

test("left and right arrows swipe", () => {
  assert.equal(swipeKeyDirection(press("ArrowLeft"), false), "left")
  assert.equal(swipeKeyDirection(press("ArrowRight"), false), "right")
  assert.equal(swipeKeyDirection(press("ArrowUp"), false), null)
})

test("arrows typed into a form field or with a dialog open don't swipe", () => {
  assert.equal(
    swipeKeyDirection(press("ArrowLeft", { targetTag: "INPUT" }), false),
    null
  )
  assert.equal(
    swipeKeyDirection(press("ArrowRight", { targetTag: "SELECT" }), false),
    null
  )
  assert.equal(
    swipeKeyDirection(press("ArrowRight", { targetEditable: true }), false),
    null
  )
  assert.equal(swipeKeyDirection(press("ArrowRight"), true), null)
})

test("held keys, browser shortcuts and handled events don't swipe", () => {
  assert.equal(
    swipeKeyDirection(press("ArrowRight", { repeat: true }), false),
    null
  )
  assert.equal(
    swipeKeyDirection(press("ArrowLeft", { altKey: true }), false),
    null
  )
  assert.equal(
    swipeKeyDirection(press("ArrowLeft", { metaKey: true }), false),
    null
  )
  assert.equal(
    swipeKeyDirection(press("ArrowRight", { defaultPrevented: true }), false),
    null
  )
})

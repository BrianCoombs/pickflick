import assert from "node:assert/strict"
import { test } from "node:test"
import { formatRuntime, linkedListLabel, peopleCount } from "./format"

test("formats a runtime in hours and minutes", () => {
  assert.equal(formatRuntime(170), "2h 50m")
  assert.equal(formatRuntime(120), "2h 0m")
  assert.equal(formatRuntime(45), "45m")
})

test("has no runtime when TMDb doesn't know it", () => {
  assert.equal(formatRuntime(0), null)
  assert.equal(formatRuntime(null), null)
  assert.equal(formatRuntime(undefined), null)
})

test("labels which watchlists a person has linked, Trakt first", () => {
  assert.equal(linkedListLabel([]), "no list")
  assert.equal(linkedListLabel([{ sourceType: "letterboxd" }]), "Letterboxd")
  assert.equal(linkedListLabel([{ sourceType: "trakt" }]), "Trakt")
  assert.equal(
    linkedListLabel([{ sourceType: "letterboxd" }, { sourceType: "trakt" }]),
    "Trakt + Letterboxd"
  )
})

test("people count reads as plain text", () => {
  assert.equal(peopleCount(1), "1 person")
  assert.equal(peopleCount(2), "2 people")
  assert.equal(peopleCount(0), "0 people")
})

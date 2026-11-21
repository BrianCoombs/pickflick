import assert from "node:assert/strict"
import { test } from "node:test"
import { needsRefresh } from "./tokens"

const now = Date.parse("2026-11-21T12:00:00Z")

test("a token with an hour left does not need refreshing", () => {
  assert.equal(needsRefresh(now + 60 * 60 * 1000, now), false)
})

test("a token expiring within five minutes needs refreshing", () => {
  assert.equal(needsRefresh(now + 4 * 60 * 1000, now), true)
})

test("an expired token needs refreshing", () => {
  assert.equal(needsRefresh(now - 1000, now), true)
})

test("a token with no known expiry needs refreshing", () => {
  assert.equal(needsRefresh(undefined, now), true)
})

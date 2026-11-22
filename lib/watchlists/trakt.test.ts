import assert from "node:assert/strict"
import { test } from "node:test"
import { traktHeaders } from "./trakt"

process.env.TRAKT_CLIENT_ID = "test-client-id"

test("identifies the app with a User-Agent, which Trakt's firewall requires", () => {
  const headers = traktHeaders() as Record<string, string>
  assert.match(headers["User-Agent"], /^PickFlick\/\d/)
  assert.equal(headers["trakt-api-key"], "test-client-id")
  assert.equal(headers["trakt-api-version"], "2")
})

test("adds the bearer token when given one", () => {
  const headers = traktHeaders("abc") as Record<string, string>
  assert.equal(headers.Authorization, "Bearer abc")
})

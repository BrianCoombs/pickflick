import assert from "node:assert/strict"
import { test } from "node:test"
import { challengeFor, createPkcePair } from "./pkce"

test("derives the S256 challenge from the RFC 7636 example verifier", () => {
  assert.equal(
    challengeFor("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
    "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
  )
})

test("creates a verifier Trakt accepts and its matching challenge", () => {
  const { verifier, challenge } = createPkcePair()
  assert.match(verifier, /^[A-Za-z0-9\-._~]{43,128}$/)
  assert.equal(challenge, challengeFor(verifier))
})

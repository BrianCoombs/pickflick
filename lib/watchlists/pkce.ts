// PKCE (RFC 7636): Trakt sign-in proves the token request comes from the app
// that started it, so no client secret is needed
import { createHash, randomBytes } from "node:crypto"

export function challengeFor(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url")
}

export function createPkcePair(): { verifier: string; challenge: string } {
  // 32 random bytes -> 43 base64url characters, all in the allowed set
  const verifier = randomBytes(32).toString("base64url")
  return { verifier, challenge: challengeFor(verifier) }
}

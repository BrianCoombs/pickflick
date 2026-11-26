import assert from "node:assert/strict"
import { test } from "node:test"
import {
  STREAMING_PROVIDERS,
  isProviderKey,
  providerByKey,
  providerIds,
  providerLogoUrl
} from "./providers"

test("lists the eight US subscription brands", () => {
  assert.deepEqual(
    STREAMING_PROVIDERS.map(p => p.key),
    [
      "netflix",
      "prime",
      "disney",
      "max",
      "hulu",
      "apple",
      "peacock",
      "paramount"
    ]
  )
})

test("turns brand keys into TMDb ids", () => {
  assert.deepEqual(providerIds(["peacock"]), [386, 387])
  assert.deepEqual(providerIds(["netflix"]), [8])
  assert.deepEqual(providerIds([]), [])
})

test("orders ids by the table and drops duplicates", () => {
  assert.deepEqual(
    providerIds(["peacock", "netflix", "peacock"]),
    [8, 386, 387]
  )
})

test("finds a provider by key", () => {
  assert.equal(providerByKey("max")?.name, "HBO Max")
  assert.deepEqual(providerByKey("max")?.tmdbIds, [1899])
  assert.equal(providerByKey("tubi"), undefined)
})

test("recognises provider keys", () => {
  assert.equal(isProviderKey("hulu"), true)
  assert.equal(isProviderKey("tubi"), false)
  assert.equal(isProviderKey(8), false)
})

test("builds a small TMDb logo URL", () => {
  assert.equal(
    providerLogoUrl(providerByKey("netflix")!),
    "https://image.tmdb.org/t/p/w92/rK1KljqmbvO9HQa1PBFLILWah72.png"
  )
})

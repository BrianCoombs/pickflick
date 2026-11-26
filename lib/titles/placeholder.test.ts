import assert from "node:assert/strict"
import { test } from "node:test"
import { loadTitlesInOrder, placeholderTitle } from "./placeholder"
import type { MediaType, Title } from "./title"

test("placeholderTitle keeps the id, key and media type", () => {
  const title = placeholderTitle("tv", 42009)
  assert.equal(title.mediaType, "tv")
  assert.equal(title.id, 42009)
  assert.equal(title.key, "tv:42009")
  assert.equal(title.name, "Tape #42009")
})

test("placeholderTitle is an empty box", () => {
  const title = placeholderTitle("movie", 603)
  assert.equal(title.key, "movie:603")
  assert.equal(title.overview, "")
  assert.equal(title.posterPath, null)
  assert.equal(title.backdropPath, null)
  assert.equal(title.rating, 0)
  assert.equal(title.voteCount, 0)
  assert.equal(title.year, null)
  assert.deepEqual(title.genres, [])
  assert.deepEqual(title.providers, [])
  assert.equal(title.trailerUrl, null)
})

const fake = (mediaType: MediaType, id: number) =>
  ({ ...placeholderTitle(mediaType, id), name: `Real ${id}` }) as Title

test("loadTitlesInOrder keeps pool order", async () => {
  const titles = await loadTitlesInOrder("movie", [3, 1, 2], async (m, id) => {
    await new Promise(r => setTimeout(r, id * 2))
    return fake(m, id)
  })
  assert.deepEqual(
    titles.map(t => t.name),
    ["Real 3", "Real 1", "Real 2"]
  )
})

test("loadTitlesInOrder swaps a failed title for a placeholder, never drops it", async () => {
  const titles = await loadTitlesInOrder("movie", [1, 2, 3], async (m, id) => {
    if (id === 2) throw new Error("TMDb down")
    return fake(m, id)
  })
  assert.equal(titles.length, 3)
  assert.deepEqual(
    titles.map(t => t.name),
    ["Real 1", "Tape #2", "Real 3"]
  )
})

test("loadTitlesInOrder runs at most `limit` loads at once", async () => {
  let running = 0
  let peak = 0
  const ids = Array.from({ length: 30 }, (_, i) => i + 1)
  const titles = await loadTitlesInOrder(
    "tv",
    ids,
    async (m, id) => {
      running++
      peak = Math.max(peak, running)
      await new Promise(r => setTimeout(r, 1))
      running--
      return fake(m, id)
    },
    8
  )
  assert.equal(titles.length, 30)
  assert.equal(peak, 8)
})

test("loadTitlesInOrder handles an empty pool", async () => {
  assert.deepEqual(
    await loadTitlesInOrder("movie", [], async (m, id) => fake(m, id)),
    []
  )
})

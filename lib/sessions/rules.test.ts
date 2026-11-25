import assert from "node:assert/strict"
import { test } from "node:test"
import {
  acceptsSwipes,
  everyoneLiked,
  isSessionMember,
  parseSwipeDirection,
  recentMatchesLimit
} from "./rules"

test("only left and right are accepted as swipe directions", () => {
  assert.equal(parseSwipeDirection("left"), "left")
  assert.equal(parseSwipeDirection("right"), "right")
  assert.equal(parseSwipeDirection("super"), null)
  assert.equal(parseSwipeDirection("RIGHT"), null)
  assert.equal(parseSwipeDirection(""), null)
  assert.equal(parseSwipeDirection(undefined), null)
  assert.equal(parseSwipeDirection({ toString: () => "right" }), null)
})

test("membership is checked against the session's user ids", () => {
  assert.equal(isSessionMember(["a", "b"], "a"), true)
  assert.equal(isSessionMember(["a", "b"], "c"), false)
  assert.equal(isSessionMember([], "a"), false)
})

test("a match needs a like from every member", () => {
  const members = ["a", "b"]
  assert.equal(
    everyoneLiked(members, [
      { userId: "a", direction: "right" },
      { userId: "b", direction: "right" }
    ]),
    true
  )
  assert.equal(
    everyoneLiked(members, [
      { userId: "a", direction: "right" },
      { userId: "b", direction: "left" }
    ]),
    false
  )
  assert.equal(
    everyoneLiked(members, [{ userId: "a", direction: "right" }]),
    false
  )
})

test("stored super swipes from old sessions still count as likes", () => {
  assert.equal(
    everyoneLiked(
      ["a", "b"],
      [
        { userId: "a", direction: "super" },
        { userId: "b", direction: "right" }
      ]
    ),
    true
  )
})

test("likes from people outside the session don't fill a member's place", () => {
  assert.equal(
    everyoneLiked(
      ["a", "b"],
      [
        { userId: "a", direction: "right" },
        { userId: "intruder", direction: "right" }
      ]
    ),
    false
  )
})

test("an empty session never matches", () => {
  assert.equal(everyoneLiked([], []), false)
})

test("the recent matches limit is clamped to 1..20", () => {
  assert.equal(recentMatchesLimit(8), 8)
  assert.equal(recentMatchesLimit(0), 1)
  assert.equal(recentMatchesLimit(-5), 1)
  assert.equal(recentMatchesLimit(500), 20)
  assert.equal(recentMatchesLimit(3.7), 3)
  assert.equal(recentMatchesLimit(Number.NaN), 8)
  assert.equal(recentMatchesLimit(Infinity), 20)
})

test("swipes are only taken while the session is in its swiping phase", () => {
  assert.equal(acceptsSwipes("started"), true)
  // Lobby: nobody has the cards yet
  assert.equal(acceptsSwipes("active"), false)
  // Matched: the movie is picked, late swipes must not pick another
  assert.equal(acceptsSwipes("completed"), false)
  assert.equal(acceptsSwipes("expired"), false)
})

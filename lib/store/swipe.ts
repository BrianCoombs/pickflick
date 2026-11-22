const DISTANCE_SHARE = 0.3 // of card width
const FLICK_VELOCITY = 500 // px per second
const FLICK_MIN_DISTANCE = 40 // px

// Where a released drag should send the card, or null to spring back
export function swipeDecision(
  offsetX: number,
  velocityX: number,
  width: number
): "left" | "right" | null {
  const direction = offsetX > 0 ? "right" : "left"
  if (Math.abs(offsetX) >= width * DISTANCE_SHARE) return direction

  const flicked =
    Math.abs(velocityX) >= FLICK_VELOCITY &&
    Math.sign(velocityX) === Math.sign(offsetX) &&
    Math.abs(offsetX) >= FLICK_MIN_DISTANCE
  return flicked ? direction : null
}

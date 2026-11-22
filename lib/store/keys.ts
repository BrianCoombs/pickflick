export interface KeyPress {
  key: string
  repeat: boolean
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  defaultPrevented: boolean
  targetTag: string
  targetEditable: boolean
}

const FORM_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"])

// Which way an arrow key should swipe, or null when the key belongs to
// something else: a form field, an open dialog, a held key or a shortcut
export function swipeKeyDirection(
  press: KeyPress,
  dialogOpen: boolean
): "left" | "right" | null {
  if (
    dialogOpen ||
    press.repeat ||
    press.defaultPrevented ||
    press.altKey ||
    press.ctrlKey ||
    press.metaKey ||
    press.shiftKey ||
    press.targetEditable ||
    FORM_TAGS.has(press.targetTag)
  ) {
    return null
  }
  if (press.key === "ArrowLeft") return "left"
  if (press.key === "ArrowRight") return "right"
  return null
}
